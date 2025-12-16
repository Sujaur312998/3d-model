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
    const handleScroll = (e) => {
      const handMoveSpeed = 0.001;
      const ballSpinSpeed = 0.0005;

      physics.current.targetScroll += e.deltaY * handMoveSpeed;

      if (physics.current.targetScroll < 0) physics.current.targetScroll = 0;
      if (physics.current.targetScroll > physics.current.maxTime) {
        physics.current.targetScroll = physics.current.maxTime;
      }

      physics.current.targetSpinVelocity = e.deltaY * ballSpinSpeed;
    };

    window.addEventListener("wheel", handleScroll);
    return () => window.removeEventListener("wheel", handleScroll);
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