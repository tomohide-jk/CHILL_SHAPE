import React from 'react'
import { animated } from '@react-spring/three'
import { useRotate } from '../hooks/useRotate'
import { MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei'

/**
 * ShapeObject
 * A placeholder object that looks like a "handcrafted daily item".
 * Composed of a few primitives to resemble a mug or a small vase.
 */
export function ShapeObject({ onSolve, isSolved }) {
  const { rotation, bind } = useRotate(onSolve)

  return (
    <animated.group {...bind()} rotation={rotation}>
      {/* Mug Body */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.6, 0.5, 1.2, 32]} />
        <meshStandardMaterial 
          color={isSolved ? "#ffb5a7" : "#f8edeb"} 
          roughness={0.2} 
          metalness={0.1} 
        />
      </mesh>

      {/* Mug Handle (The part that needs to be aligned) */}
      <mesh castShadow position={[0.7, 0, 0]}>
        <torusGeometry args={[0.3, 0.08, 16, 32, Math.PI]} />
        <meshStandardMaterial 
          color={isSolved ? "#ffb5a7" : "#f8edeb"} 
          roughness={0.2} 
        />
      </mesh>

      {/* Internal "soul" light that glows when solved */}
      {isSolved && (
        <mesh scale={[0.4, 0.4, 0.4]}>
          <sphereGeometry />
          <MeshDistortMaterial 
            color="#ffb5a7" 
            speed={2} 
            distort={0.4} 
            emissive="#ffb5a7" 
            emissiveIntensity={2} 
          />
        </mesh>
      )}
    </animated.group>
  )
}
