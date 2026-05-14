import React, { useState } from 'react'
import { Environment, ContactShadows, Float } from '@react-three/drei'
import { ShapeObject } from './Object'

export function Scene({ onSolve, isSolved }) {

  return (
    <>
      <color attach="background" args={['#1a1a2e']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#404080" />
      <spotLight 
        position={[10, 10, 10]} 
        angle={0.15} 
        penumbra={1} 
        intensity={1.5} 
        castShadow 
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffb5a7" />

      {/* Main Object */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <ShapeObject onSolve={onSolve} isSolved={isSolved} />
      </Float>

      {/* Ground shadows for a grounded feel */}
      <ContactShadows 
        position={[0, -2, 0]} 
        opacity={0.4} 
        scale={10} 
        blur={2.5} 
        far={4} 
      />

      <Environment preset="city" />
    </>
  )
}
