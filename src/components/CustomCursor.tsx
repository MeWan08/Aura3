'use client'

import { useState, useEffect } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export function CustomCursor() {
  const [isMounted, setIsMounted] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  
  // Outer ring (follows with lag)
  const cursorX = useSpring(-100, { stiffness: 350, damping: 28 })
  const cursorY = useSpring(-100, { stiffness: 350, damping: 28 })
  
  // Inner dot (follows instantly)
  const dotX = useSpring(-100, { stiffness: 1000, damping: 20 })
  const dotY = useSpring(-100, { stiffness: 1000, damping: 20 })
  
  useEffect(() => {
    setIsMounted(true)
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16)
      cursorY.set(e.clientY - 16)
      dotX.set(e.clientX - 4)
      dotY.set(e.clientY - 4)
      
      const target = e.target as HTMLElement
      const isClickable = window.getComputedStyle(target).cursor === 'pointer' || target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button'
      setIsHovering(isClickable)
    }
    
    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)
    
    window.addEventListener('mousemove', moveCursor)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', moveCursor)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [cursorX, cursorY, dotX, dotY])

  if (!isMounted) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `* { cursor: none !important; }`}} />
      
      {/* Outer Ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[9999] border border-[#0b7f98] bg-[#03e1ff]/[0.04] mix-blend-normal overflow-hidden"
        style={{ x: cursorX, y: cursorY }}
        animate={{
          scale: isClicking ? 0.8 : isHovering ? 1.5 : 1,
          borderColor: isHovering ? "rgba(15,138,102,0.95)" : "rgba(11,127,152,0.9)",
          boxShadow: isHovering ? "0 0 20px rgba(15,138,102,0.35), inset 0 0 10px rgba(15,138,102,0.2)" : "0 0 12px rgba(11,127,152,0.25)"
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      />
      
      {/* Inner Energy Core */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[9999] bg-[#0f8a66] mix-blend-normal"
        style={{ x: dotX, y: dotY }}
        animate={{
          scale: isClicking ? 0.5 : 1,
          boxShadow: isHovering ? "0 0 12px rgba(2,132,161,0.45)" : "0 0 10px rgba(15,138,102,0.45)",
          backgroundColor: isHovering ? "#0284a1" : "#0f8a66"
        }}
      />
    </>
  )
}
