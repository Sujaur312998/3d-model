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
  });

  useEffect(() => {
    if (actions && names.length > 0) {
      const action = actions[names[0]];
      action.play();
      action.paused = true;
      physics.current.maxTime = action.getClip().duration;
    }

    ballsRef.current = [];
    scene.traverse((child) => {
      if (
        child.isMesh &&
        (child.name.toLowerCase().includes("ball") ||
          child.name.toLowerCase().includes("circle") ||
          child.name.toLowerCase().includes("sphere"))
      ) {
        ballsRef.current.push(child);
      }
    });
  }, [actions, names, scene]);

  useEffect(() => {
    const baseSpeedMultiplier = 0.01;
    const ballSpinMultiplier = 0.05;

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

      // Use drag speed to determine animation speed
      const speedMultiplier = Math.max(speed / 10, 0.1); // Normalize speed, min 0.1
      const handMoveSpeed = baseSpeedMultiplier * speedMultiplier;
      const ballSpinSpeed = ballSpinMultiplier * speedMultiplier;

      physics.current.targetScroll += deltaY * handMoveSpeed;

      if (physics.current.targetScroll < 0) physics.current.targetScroll = 0;
      if (physics.current.targetScroll > physics.current.maxTime) {
        physics.current.targetScroll = physics.current.maxTime;
      }

      physics.current.targetSpinVelocity = deltaY * ballSpinSpeed;

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
    p.scrollPos = THREE.MathUtils.lerp(p.scrollPos, p.targetScroll, 0.08);
    if (mixer) mixer.setTime(p.scrollPos);

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