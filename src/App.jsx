import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

// Custom hook for typing effect
function useTypingEffect(text, speed = 50) {
  const [displayText, setDisplayText] = useState('')
  
  useEffect(() => {
    setDisplayText('')
    let currentIndex = 0
    
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, speed)
    
    return () => clearInterval(interval)
  }, [text, speed])
  
  return displayText
}

// Ball names
const BALL_NAMES = [
  'Web Development',
  'Branding and Communication',
  'AI Analyst & Developer',
  'Strategy and Marketing',
  'Software & App Developer'
]

function Model({ onSwipe, swapIndex, onBallInHand }) {
  const { scene, animations } = useGLTF('/model.glb')
  const groupRef = useRef()
  const sceneRef = useMemo(() => ({ current: scene }), [scene])
  const { actions, mixer, names } = useAnimations(animations, sceneRef)
  const ballRefs = useRef([])
  const ballColors = useRef([
    new THREE.Color('#FF6B6B'), // Coral Red - 0
    new THREE.Color('#4ECDC4'), // Turquoise - 1
    new THREE.Color('#FFD166'), // Sun Yellow - 2
    new THREE.Color('#06D6A0'), // Emerald Green - 3
    new THREE.Color('#118AB2')  // Ocean Blue - 4
  ])

  useEffect(() => {
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
        
        // Clone the material to avoid affecting other instances
        if (child.material && ballIndex < ballColors.current.length) {
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(0x000000) // Reset emissive if any
          
          // Optional: Add some shine to the balls
          if (child.material.type === 'MeshStandardMaterial' || 
              child.material.type === 'MeshPhysicalMaterial') {
            child.material.metalness = 0.3
            child.material.roughness = 0.4
          }
          
          console.log(`Found ball ${ballIndex}: ${child.name}`)
          ballIndex++
        }
      }
    })

    // Log how many balls were found
    console.log(`Found ${ballRefs.current.length} balls`)

  }, [scene])

  // Update ball colors based on swap index
  useEffect(() => {
    if (ballRefs.current.length > 0) {
      ballRefs.current.forEach((ball, index) => {
        if (ball.material) {
          // Rotate colors based on swap index
          // swapIndex 0: [0,1,2,3,4] -> Red, Turquoise, Yellow, Green, Blue
          // swapIndex 1: [1,2,3,4,0] -> Turquoise, Yellow, Green, Blue, Red
          // swapIndex 2: [2,3,4,0,1] -> Yellow, Green, Blue, Red, Turquoise
          const colorIndex = (index + swapIndex) % ballColors.current.length
          ball.material.color = ballColors.current[colorIndex]
          ball.material.needsUpdate = true
        }
      })
      console.log(`Updated ball colors for swap ${swapIndex}`)
    }
  }, [swapIndex])

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
      
      let action = null
      
      // Try to play by name first
      if (names && names.length > 0) {
        const actionName = names[0]
        if (actions[actionName]) {
          action = actions[actionName]
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
          action.reset().fadeIn(0.5).play()
        }
      }
      
      // Fallback: play first animation directly using mixer
      if (!action) {
        const clip = animations[0]
        action = mixer.clipAction(clip, scene)
        action.setLoop(THREE.LoopOnce, 1)
        action.clampWhenFinished = true
        action.reset().fadeIn(0.5).play()
      }
      
      // Listen for animation finish to notify when ball is in hand
      if (action && mixer) {
        const onFinished = (e) => {
          if (e.action === action) {
            // Animation finished, ball is now in hand
            onBallInHand(swapIndex)
            mixer.removeEventListener('finished', onFinished)
          }
        }
        mixer.addEventListener('finished', onFinished)
      }
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
  const [swapIndex, setSwapIndex] = useState(0)
  const [swapCount, setSwapCount] = useState(0)
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const containerRef = useRef()
  const [currentBallInHand, setCurrentBallInHand] = useState(0)
  
  // Use typing effect for the current ball name
  const typedBallName = useTypingEffect(BALL_NAMES[currentBallInHand], 50)

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
        setSwapCount(prev => prev + 1)
        // Only change colors after the first swap
        setSwapIndex(prev => swapCount > 0 ? (prev + 1) % 5 : prev)
        // setShowInstructions(false)
      }
    }
    
    // Reset touch start values
    touchStartY.current = 0
    touchStartX.current = 0
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
      setSwapCount(prev => prev + 1)
      // Only change colors after the first swap
      setSwapIndex(prev => swapCount > 0 ? (prev + 1) % 5 : prev)
      // setShowInstructions(false)
    }
    
    isMouseDown.current = false
  }

  const handleMouseMove = (e) => {
    if (!isMouseDown.current) return
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    isMouseDown.current = false
  }

  // Handle when ball is in hand
  const handleBallInHand = () => {
    // Increment the ball index with each swap
    setCurrentBallInHand(prev => (prev + 1) % 5)
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
        
        <Model onSwipe={swipeTrigger} swapIndex={swapIndex} onBallInHand={handleBallInHand} />
        <OrbitControls 
          enableRotate={false} 
          enablePan={false} 
          enableZoom={false}
          maxDistance={10}
          minDistance={3}
        />
      </Canvas>
      
      {/* Display current ball name with typing effect */}
      {currentBallInHand !== null && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'black',
          padding: '20px 40px',
          borderRadius: '15px',
          fontSize: '24px',
          fontWeight: 'bold',
          zIndex: 1000,
          textAlign: 'center',
          animation: 'fadeIn 0.6s ease-out forwards',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.5px',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {typedBallName}
        </div>
      )}
    </div>
  );
}

export default App