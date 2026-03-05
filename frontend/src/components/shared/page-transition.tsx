/**
 * Page Transition - Framer-motion wrapper for page content
 * Respects prefers-reduced-motion
 */

'use client'

import { motion } from 'framer-motion'
import { useReduceMotion } from '@/hooks/useReduceMotion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReduceMotion()

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
