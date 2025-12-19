import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

function Model({ onSwipe }) {
  const { scene, animations } = useGLTF('/model.glb')
  const groupRef = useRef()
  const sceneRef = useMemo(() => ({ current: scene }), [scene])
  const { actions, mixer, names } = useAnimations(animations, sceneRef)

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
        touchAction: 'none' // Prevent browser touch actions
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Model onSwipe={swipeTrigger} />
        <OrbitControls enableRotate={false} enablePan={false} enableZoom={true} />
      </Canvas>
      
      {/* Optional: Add swipe instructions */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '10px 20px',
        borderRadius: '20px',
        fontSize: '14px',
        pointerEvents: 'none'
      }}>
        Swipe up or down to animate
      </div>
    </div>
  )
}

export default App