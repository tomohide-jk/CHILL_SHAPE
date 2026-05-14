import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function UI({ isSolved }) {
  return (
    <div className="ui-root">
      <div className="header">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          CHILL_SHAPE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          Gently rotate and find the balance
        </motion.p>
      </div>

      <AnimatePresence>
        {isSolved && (
          <motion.div 
            className="success-message"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <h2>Harmonized</h2>
            <p>Peace restored to the form.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .ui-root {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 40px;
        }
        .header h1 {
          font-size: 1.2rem;
          font-weight: 300;
          letter-spacing: 0.5rem;
          color: var(--accent);
        }
        .header p {
          font-size: 0.7rem;
          letter-spacing: 0.2rem;
          text-transform: uppercase;
          margin-top: 10px;
        }
        .success-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .success-message h2 {
          font-size: 2.5rem;
          font-weight: 500;
          letter-spacing: 0.3rem;
          color: var(--accent);
        }
        .success-message p {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-top: 8px;
        }
      `}</style>
    </div>
  )
}
