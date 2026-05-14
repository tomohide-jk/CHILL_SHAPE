import { useDrag } from '@use-gesture/react'
import { useSpring } from '@react-spring/three'
import { MathUtils } from 'three'

/**
 * useRotate Hook
 * Handles smooth inertial rotation using use-gesture and react-spring.
 * 
 * @param {Function} onSnap - Callback when the object snaps to a correct position
 */
export function useRotate(onSnap) {
  // Spring for the rotation [x, y, z]
  const [{ rotation }, api] = useSpring(() => ({
    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
    config: { mass: 2, tension: 120, friction: 40 } // Heavy, smooth friction
  }))

  const bind = useDrag(({ offset: [x, y], velocity: [vx, vy], active, last }) => {
    // Rotation sensitivity
    const factor = 0.01

    if (active) {
      // Direct rotation while dragging
      api.start({ 
        rotation: [y * factor, x * factor, 0], 
        immediate: true 
      })
    } else if (last) {
      // Calculate where it would end up based on velocity (inertia)
      const targetX = (y * factor) + (vy * 0.5 * (vy > 0 ? 1 : -1))
      const targetY = (x * factor) + (vx * 0.5 * (vx > 0 ? 1 : -1))

      // Puzzle Snap Logic:
      // If the target rotation is close to multiples of 2*PI (or 0), snap it
      const snapThreshold = 0.3
      const snapX = Math.round(targetX / (Math.PI * 2)) * (Math.PI * 2)
      const snapY = Math.round(targetY / (Math.PI * 2)) * (Math.PI * 2)

      const isSnappingX = Math.abs(targetX - snapX) < snapThreshold
      const isSnappingY = Math.abs(targetY - snapY) < snapThreshold

      if (isSnappingX && isSnappingY) {
        api.start({ 
          rotation: [snapX, snapY, 0],
          config: { tension: 170, friction: 26 }, // Crisper snap
          onRest: () => onSnap && onSnap()
        })
      } else {
        // Just natural inertial decay
        api.start({ 
          rotation: [targetX, targetY, 0],
          config: { mass: 2, tension: 80, friction: 40 }
        })
      }
    }
  }, { 
    from: () => [rotation.get()[1] / 0.01, rotation.get()[0] / 0.01],
    pointerEvents: true 
  })

  return { rotation, bind }
}
