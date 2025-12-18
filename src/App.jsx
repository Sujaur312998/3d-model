import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  Center,
} from "@react-three/drei";
import * as THREE from "three";

function Model() {
  const { scene, animations } = useGLTF("/model.glb");
  const sceneRef = useMemo(() => ({ current: scene }), [scene]);
  const { mixer, actions, names } = useAnimations(animations, sceneRef);

  const ballsRef = useRef([]);

  const physics = useRef({
    scrollPos: 0,
    targetScroll: 0,
    maxTime: 0,
    spinVelocity: 0,
    targetSpinVelocity: 0,
    isDragging: false,
    lastY: 0,
    lastTime: 0,
    dragSpeed: 0,
    leftShoulder: null,
    leftArm: null,
    leftWrist: null,
    handOffset: 0,
  });

  useEffect(() => {
    if (actions && names.length > 0) {
      const action = actions[names[0]];
      action.play();
      action.paused = false; // Set to false to allow continuous looping
      physics.current.maxTime = action.getClip().duration;
    }

    ballsRef.current = [];
    physics.current.leftShoulder = null;
    physics.current.leftArm = null;
    physics.current.leftWrist = null;
    physics.current.leftArmBaseRotation = new THREE.Euler(); // To store original pose

    scene.traverse((child) => {
      // ... (keep existing ball detection)
      if (
        child.isMesh &&
        (child.name.toLowerCase().includes("ball") ||
          child.name.toLowerCase().includes("circle") ||
          child.name.toLowerCase().includes("sphere"))
      ) {
        ballsRef.current.push(child);
      }

      // Find left arm chain
      const name = child.name.toLowerCase();
      const isLeft = name.includes("left") || name.startsWith("l_") || name.includes("_l") || name.includes(".l");
      
      if (isLeft) {
        if (name.includes("shoulder") || name.includes("uparm") || name.includes("upperarm")) {
          physics.current.leftShoulder = child;
        } else if (name.includes("forearm") || name.includes("lowerarm") || (name.includes("arm") && !name.includes("up"))) {
          physics.current.leftArm = child;
          physics.current.leftArmBaseRotation.copy(child.rotation); // Capture original rotation
        } else if (name.includes("wrist") || name.includes("hand")) {
          physics.current.leftWrist = child;
        }
      }
    });
  }, [actions, names, scene]);

  useEffect(() => {
    const baseSpeedMultiplier = 0.01;
    const ballSpinMultiplier = 0.1; // Increased for more dramatic hand/ball spin interaction

    const getClientY = (e) => {
      // For touch events, use touches[0].clientY, for mouse use clientY
      return e.touches ? e.touches[0].clientY : e.clientY;
    };

    const handleStart = (e) => {
      physics.current.isDragging = true;
      physics.current.lastY = getClientY(e);
      physics.current.lastTime = performance.now();
      physics.current.dragSpeed = 0;
      // Prevent default to avoid scrolling on mobile
      if (e.touches) {
        e.preventDefault();
      }
    };

    const handleMove = (e) => {
      if (!physics.current.isDragging) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - physics.current.lastTime;
      const currentY = getClientY(e);
      const deltaY = currentY - physics.current.lastY;
      
      // Calculate drag speed (pixels per millisecond)
      const speed = Math.abs(deltaY) / Math.max(deltaTime, 1);
      physics.current.dragSpeed = speed;
      
      physics.current.lastY = currentY;
      physics.current.lastTime = currentTime;

      // Use drag distance to drive the interaction
      // A drag of roughly 250 pixels will complete one full interaction cycle
      const interactionScale = 1 / 250;
      const movement = -deltaY * interactionScale;

      physics.current.targetScroll += movement * physics.current.maxTime;
      physics.current.handOffset += movement;

      if (physics.current.targetScroll < 0) physics.current.targetScroll = 0;
      if (physics.current.targetScroll > physics.current.maxTime) {
        physics.current.targetScroll = physics.current.maxTime;
      }
      
      // Clamp hand offset between -1 and 1 for the procedural arm logic
      physics.current.handOffset = THREE.MathUtils.clamp(physics.current.handOffset, -1, 1);

      physics.current.targetSpinVelocity = deltaY * ballSpinMultiplier * 0.5;

      // Prevent default to avoid scrolling on mobile
      if (e.touches) {
        e.preventDefault();
      }
    };

    const handleEnd = () => {
      physics.current.isDragging = false;
      physics.current.dragSpeed = 0;
    };

    // Mouse events
    window.addEventListener("mousedown", handleStart);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);

    // Touch events for mobile
    window.addEventListener("touchstart", handleStart, { passive: false });
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);

    return () => {
      window.removeEventListener("mousedown", handleStart);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, []);

  useFrame((state, delta) => {
    const p = physics.current;
    
    // Decay handOffset and targetScroll back to 0 when not dragging
    if (!p.isDragging) {
      p.targetScroll = THREE.MathUtils.lerp(p.targetScroll, 0, 0.08); // Reset faster when let go
      p.handOffset = THREE.MathUtils.lerp(p.handOffset, 0, 0.08);
    }

    p.scrollPos = THREE.MathUtils.lerp(p.scrollPos, p.targetScroll, 0.15); // Snappier response
    if (mixer) mixer.setTime(p.scrollPos);

    const motion = THREE.MathUtils.clamp(p.handOffset, -1, 1);

    if (p.leftArm) {
      // Rotation logic relative to base rotation
      const angleUp = 90 * (Math.PI / 180);
      const angleDown = 20 * (Math.PI / 180);
      const targetRotation = motion > 0 ? motion * angleUp : motion * angleDown;
      
      // Add the interaction rotation TO the base rotation
      p.leftArm.rotation.x = THREE.MathUtils.lerp(
        p.leftArm.rotation.x, 
        p.leftArmBaseRotation.x + targetRotation, 
        0.2 // Snappier arm movement
      );
      
      // Subtle position reset
      const targetLift = motion > 0 ? motion * 0.2 : motion * 0.1;
      p.leftArm.position.y = THREE.MathUtils.lerp(p.leftArm.position.y, targetLift, 0.1);
    }
    
    if (p.leftWrist) {
      // Wrist follows the lift subtly
      const targetWristLift = motion > 0 ? motion * 0.1 : motion * 0.05;
      p.leftWrist.position.y = THREE.MathUtils.lerp(p.leftWrist.position.y, targetWristLift, 0.1);
    }

    p.spinVelocity += (p.targetSpinVelocity - p.spinVelocity) * 0.05;
    p.targetSpinVelocity *= 0.95;

    if (ballsRef.current.length > 0) {
      ballsRef.current.forEach((ball) => {
        ball.rotation.x += p.spinVelocity;
      });
    }
  });

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

function App() {
  return (
    <div style={{ height: "100vh", width: "100vw", background: "#f5f5f5" }}>

      <Canvas camera={{ position: [0, 0, 11], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-5, 0, 0]} intensity={0.5} />

        <Model />

        <OrbitControls
          enableZoom={false} 
          enablePan={false} 
          enableRotate={false} 
        />
      </Canvas>
    </div>
  );
}

export default App;