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
    scrollVelocity: 0,
    spinVelocity: 0,
    targetSpinVelocity: 0,
    isDragging: false,
    lastY: 0,
    startY: 0,
    dragSpeed: 0,

    // Hand Physics
    leftShoulder: null,
    leftArm: null,
    leftWrist: null,
    leftArmBaseRotation: new THREE.Euler(),
    smoothMotion: 0,
    handOffset: 0,
    handInteractionTriggered: false,
    handInteractionProgress: 0,
    handInteractionDirection: 0,
  });

  useEffect(() => {
    if (actions && names.length > 0) {
      const action = actions[names[0]];
      action.play();
      action.paused = false;
      physics.current.maxTime = action.getClip().duration;
    }

    // Reset References
    ballsRef.current = [];
    physics.current.leftShoulder = null;
    physics.current.leftArm = null;
    physics.current.leftWrist = null;
    physics.current.leftArmBaseRotation = new THREE.Euler();
    physics.current.smoothMotion = 0;
    physics.current.handInteractionTriggered = false;

    scene.traverse((child) => {
      if (
        child.isMesh &&
        (child.name.toLowerCase().includes("ball") ||
          child.name.toLowerCase().includes("circle") ||
          child.name.toLowerCase().includes("sphere"))
      ) {
        ballsRef.current.push(child);
      }

      const name = child.name.toLowerCase();
      const isLeft =
        name.includes("left") ||
        name.startsWith("l_") ||
        name.includes("_l") ||
        name.includes(".l");

      if (isLeft) {
        if (
          name.includes("forearm") ||
          name.includes("lowerarm") ||
          (name.includes("arm") && !name.includes("up"))
        ) {
          physics.current.leftArm = child;
          physics.current.leftArmBaseRotation.copy(child.rotation);
        } else if (name.includes("wrist") || name.includes("hand")) {
          physics.current.leftWrist = child;
        }
      }
    });
  }, [actions, names, scene]);

  useEffect(() => {
    const ballSpinMultiplier = 0.005;

    const getClientY = (e) => {
      return e.touches ? e.touches[0].clientY : e.clientY;
    };

    const handleStart = (e) => {
      physics.current.isDragging = true;
      physics.current.handInteractionTriggered = false;
      physics.current.handInteractionProgress = 0;
      const currentY = getClientY(e);
      physics.current.lastY = currentY;
      physics.current.startY = currentY;

      if (e.touches) e.preventDefault();
    };

    const handleMove = (e) => {
      if (!physics.current.isDragging) return;

      const currentY = getClientY(e);
      const deltaY = currentY - physics.current.lastY;
      physics.current.lastY = currentY;

      // 1. Update Target Scroll (The destination)
      const interactionScale = 1 / 250;
      const movement = -deltaY * interactionScale;
      physics.current.targetScroll += movement * physics.current.maxTime;

      // 2. Hand Logic (Trigger once per drag)
      if (!physics.current.handInteractionTriggered) {
        const totalDisplacement = currentY - physics.current.startY;
        if (Math.abs(totalDisplacement) > 20) {
          physics.current.handInteractionTriggered = true;
          physics.current.handInteractionDirection =
            totalDisplacement < 0 ? 1 : -1;
          physics.current.handInteractionProgress = 0;
        }
      }

      // 3. Ball Spin Logic
      physics.current.targetSpinVelocity = deltaY * ballSpinMultiplier * 0.5;

      if (e.touches) e.preventDefault();
    };

    const handleEnd = () => {
      physics.current.isDragging = false;
    };

    window.addEventListener("mousedown", handleStart);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
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

    // --- 1. SMOOTHER SCROLL INTERPOLATION ---
    // Use damping formula: lerp(current, target, 1 - exp(-decay * delta))
    // This makes the catch-up speed independent of frame rate
    const dampFactor = 1 - Math.exp(-10 * delta);
    p.scrollPos = THREE.MathUtils.lerp(p.scrollPos, p.targetScroll, dampFactor);

    // Animation Mixer Update
    if (mixer && p.maxTime > 0) {
      const loopedTime = ((p.scrollPos % p.maxTime) + p.maxTime) % p.maxTime;
      mixer.setTime(loopedTime);
    }

    // --- 2. SMOOTHER HAND ANIMATION ---
    if (p.handInteractionTriggered && p.handInteractionProgress < 1) {
      p.handInteractionProgress += delta * 2.5;
      const progress = Math.min(p.handInteractionProgress, 1);
      p.handOffset = Math.sin(progress * Math.PI) * p.handInteractionDirection;
    } else {
      // Slower decay for smoother return to rest
      p.handOffset = THREE.MathUtils.lerp(p.handOffset, 0, delta * 5);
    }

    // Smooth motion for bones
    p.smoothMotion = THREE.MathUtils.lerp(
      p.smoothMotion,
      p.handOffset,
      delta * 10
    );
    const motion = THREE.MathUtils.clamp(p.smoothMotion, -1, 1);

    if (p.leftArm) {
      const angleUp = 90 * (Math.PI / 180);
      const angleDown = 20 * (Math.PI / 180);
      const targetRotation = motion > 0 ? motion * angleUp : motion * angleDown;

      p.leftArm.rotation.x = p.leftArmBaseRotation.x + targetRotation;
      p.leftArm.position.y = motion > 0 ? motion * 0.2 : motion * 0.1;
    }

    if (p.leftWrist) {
      p.leftWrist.position.y = motion > 0 ? motion * 0.1 : motion * 0.05;
    }

    // --- 3. SMOOTHER BALL SPIN ---
    // Interpolate spin velocity towards target, then decay target
    p.spinVelocity = THREE.MathUtils.lerp(
      p.spinVelocity,
      p.targetSpinVelocity,
      delta * 10
    );
    p.targetSpinVelocity = THREE.MathUtils.lerp(
      p.targetSpinVelocity,
      0,
      delta * 2
    ); // Friction

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
      <Canvas camera={{ position: [2, 0, 11], fov: 45 }}>
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