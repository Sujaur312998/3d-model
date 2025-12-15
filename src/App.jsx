import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect } from 'react'

function Model() {
  const { scene, animations } = useGLTF('/model.glb')
  const groupRef = useRef()
  const { actions, mixer } = useAnimations(animations, groupRef)
  const circleRef = useRef()

  useEffect(() => {
    scene.traverse((child) => {
      console.log(child.name, child.type)
      if (child.name.includes('circle') || child.name.includes('Circle') || child.name.includes('balls') || child.name.includes('Balls')) {
        circleRef.current = child
      }
    })
  }, [scene])

  // Update animation mixer each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  // Play animation on click
  const handleClick = () => {
    if (animations && animations.length > 0) {
      // Play the first animation (you can modify this to play a specific animation by name)
      const actionName = Object.keys(actions)[0]
      if (actions[actionName]) {
        actions[actionName].reset().play()
      } else if (animations[0] && mixer) {
        // Fallback: play animation directly
        const action = mixer.clipAction(animations[0])
        action.reset().play()
      }
    }
  }

  return (
    <primitive 
      ref={groupRef}
      object={scene} 
      onClick={handleClick}
      onPointerDown={handleClick}
    />
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
