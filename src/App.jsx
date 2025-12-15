import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

function Model() {
  const { scene, animations } = useGLTF('/model.glb')
  const groupRef = useRef()
  const sceneRef = useMemo(() => ({ current: scene }), [scene])
  const { actions, mixer, names } = useAnimations(animations, sceneRef)
  const circleRef = useRef()

  useEffect(() => {
    scene.traverse((child) => {
      // console.log(child.name, child.type)
      if (child.name.includes('circle') || child.name.includes('Circle') || child.name.includes('balls') || child.name.includes('Balls')) {
        circleRef.current = child
      }
    })
    
    // Debug: Log available animations
    // console.log('Available animations:', animations)
    // console.log('Animation names:', names)
    // console.log('Actions:', actions)
  }, [scene, animations, names, actions])

  // Update animation mixer each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  // Play animation on click
  const handleClick = (event) => {
    event.stopPropagation()
    // console.log('Click detected!')
    // console.log('Animations:', animations)
    // console.log('Actions:', actions)
    // console.log('Names:', names)
    
    if (animations && animations.length > 0 && mixer) {
      // Stop all currently playing animations
      Object.values(actions).forEach(action => {
        if (action) {
          action.stop()
        }
      })
      
      // Try to play by name first
      if (names && names.length > 0) {
        const actionName = names[0]
        // console.log('Playing animation:', actionName)
        if (actions[actionName]) {
          const action = actions[actionName]
          action.setLoop(THREE.LoopOnce, 1) // Play once, then stop
          action.clampWhenFinished = true // Keep at the last frame
          action.reset().fadeIn(0.5).play()
          return
        }
      }
      
      // Fallback: play first animation directly using mixer
      // console.log('Playing animation directly via mixer')
      const clip = animations[0]
      const action = mixer.clipAction(clip, scene)
      action.setLoop(THREE.LoopOnce, 1) // Play once, then stop
      action.clampWhenFinished = true // Keep at the last frame
      action.reset().fadeIn(0.5).play()
    } else {
      console.log('No animations or mixer available')
    }
  }

  return (
    <group ref={groupRef}>
      <primitive 
        object={scene} 
        onClick={handleClick} 
        onPointerDown={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        }}
      />
    </group>
  )
}

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Model />
        <OrbitControls enableRotate={false} enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  )
}

export default App
