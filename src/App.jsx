import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { UI } from './components/UI'
import './App.css'

function App() {
  const [isSolved, setIsSolved] = React.useState(false)

  return (
    <div className="app-container">
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene onSolve={() => setIsSolved(true)} isSolved={isSolved} />
        </Suspense>
      </Canvas>
      <UI isSolved={isSolved} />
      <div className="background-overlay" />
    </div>
  )
}

export default App
