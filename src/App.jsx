import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

function Model({ onSwipe }) {
  const { scene, animations } = useGLTF('/model.glb')
  const groupRef = useRef()
  const sceneRef = useMemo(() => ({ current: scene }), [scene])
  const { actions, mixer, names } = useAnimations(animations, sceneRef)
  const ballRefs = useRef([])

  useEffect(() => {
    // Colors for the balls - 5 distinct colors
    const ballColors = [
      new THREE.Color('#FF6B6B'), // Coral Red
      new THREE.Color('#4ECDC4'), // Turquoise
      new THREE.Color('#FFD166'), // Sun Yellow
      new THREE.Color('#06D6A0'), // Emerald Green
      new THREE.Color('#118AB2')  // Ocean Blue
    ]

    let ballIndex = 0
    ballRefs.current = [] // Reset array
    
    scene.traverse((child) => {
      // Look for balls/circles/spheres in the model
      if (child.isMesh && (
        child.name.toLowerCase().includes('circle') || 
        child.name.toLowerCase().includes('ball') ||
        child.name.toLowerCase().includes('sphere') ||
        child.name.toLowerCase().includes('orb') ||
        (child.geometry && child.geometry.type === 'SphereGeometry')
      )) {
        // Store reference
        ballRefs.current.push(child)
        
        // Assign color if we haven't used all colors yet
        if (ballIndex < ballColors.length) {
          // Clone the material to avoid affecting other instances
          if (child.material) {
            child.material = child.material.clone()
            child.material.color = ballColors[ballIndex]
            child.material.emissive = new THREE.Color(0x000000) // Reset emissive if any
            child.material.needsUpdate = true
            
            // Optional: Add some shine to the balls
            if (child.material.type === 'MeshStandardMaterial' || 
                child.material.type === 'MeshPhysicalMaterial') {
              child.material.metalness = 0.3
              child.material.roughness = 0.4
            }
            
            console.log(`Assigned color ${ballIndex + 1} to ball: ${child.name}`)
            ballIndex++
          }
        } else {
          // For balls beyond 5, assign random colors or repeat the palette
          if (child.material) {
            child.material = child.material.clone()
            const repeatIndex = ballIndex % ballColors.length
            child.material.color = ballColors[repeatIndex]
            child.material.needsUpdate = true
            ballIndex++
          }
        }
      }
    })

    // Log how many balls were found and colored
    console.log(`Found and colored ${ballRefs.current.length} balls`)

  }, [scene])

  // Update animation mixer each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  // Function to play animation
  const playAnimation = () => {
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
        if (actions[actionName]) {
          const action = actions[actionName]
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
          action.reset().fadeIn(0.5).play()
          return
        }
      }
      
      // Fallback: play first animation directly using mixer
      const clip = animations[0]
      const action = mixer.clipAction(clip, scene)
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.reset().fadeIn(0.5).play()
    }
  }

  // Play animation when onSwipe prop changes
  useEffect(() => {
    if (onSwipe && animations && mixer) {
      playAnimation()
    }
  }, [onSwipe, animations, mixer])

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

function App() {
  const [swipeTrigger, setSwipeTrigger] = useState(0)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const containerRef = useRef()
  const [showInstructions, setShowInstructions] = useState(true)

  // Handle touch start
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartY.current = touch.clientY
    touchStartX.current = touch.clientX
  }

  // Handle touch end - detect swipe
  const handleTouchEnd = (e) => {
    if (!touchStartY.current) return

    const touch = e.changedTouches[0]
    const touchEndY = touch.clientY
    const touchEndX = touch.clientX
    
    const deltaY = touchEndY - touchStartY.current
    const deltaX = touchEndX - touchStartX.current
    
    // Check if it's a vertical swipe (more vertical than horizontal)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Minimum swipe distance (in pixels)
      const minSwipeDistance = 50
      
      if (Math.abs(deltaY) > minSwipeDistance) {
        // Trigger animation on any vertical swipe (up or down)
        setSwipeTrigger(prev => prev + 1)
        setShowInstructions(false)
      }
    }
    
    // Reset touch start values
    touchStartY.current = 0
    touchStartX.current = 0
  }

  // Handle wheel event (for mouse wheel/trackpad)
  const handleWheel = (e) => {
    // Prevent page scrolling
    e.preventDefault()
    
    // Minimum wheel delta to trigger animation
    const minWheelDelta = 50
    
    if (Math.abs(e.deltaY) > minWheelDelta) {
      setSwipeTrigger(prev => prev + 1)
      setShowInstructions(false)
    }
  }

  // Handle mouse down/up for desktop drag simulation
  const mouseStartY = useRef(0)
  const isMouseDown = useRef(false)

  const handleMouseDown = (e) => {
    isMouseDown.current = true
    mouseStartY.current = e.clientY
  }

  const handleMouseUp = (e) => {
    if (!isMouseDown.current) return
    
    const mouseEndY = e.clientY
    const deltaY = mouseEndY - mouseStartY.current
    
    // Minimum drag distance (in pixels)
    const minDragDistance = 100
    
    if (Math.abs(deltaY) > minDragDistance) {
      setSwipeTrigger(prev => prev + 1)
      setShowInstructions(false)
    }
    
    isMouseDown.current = false
  }

  const handleMouseMove = (e) => {
    if (!isMouseDown.current) return
    
    // Optional: Add visual feedback during drag
    // You could add a visual indicator here
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    isMouseDown.current = false
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        height: '100vh',
        width: '100vw',
        touchAction: 'none',
        overflow: 'hidden',
        position: 'relative'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Canvas camera={{ position: [2, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
        />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        
        <Model onSwipe={swipeTrigger} />
        <OrbitControls 
          enableRotate={false} 
          enablePan={false} 
          enableZoom={true}
          maxDistance={10}
          minDistance={3}
        />
      </Canvas>     
    </div>
  )
}

export default App