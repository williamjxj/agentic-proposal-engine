/**
 * useTheme Hook
 * 
 * Manages theme switching between Ocean Breeze (default) and Classic themes.
 */

'use client'

import { useEffect, useState } from 'react'

export type Theme = 'ocean-breeze' | 'classic'

const THEME_STORAGE_KEY = 'app-theme'
const DEFAULT_THEME: Theme = 'ocean-breeze'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load theme from localStorage or use default
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (storedTheme && (storedTheme === 'ocean-breeze' || storedTheme === 'classic')) {
      setTheme(storedTheme)
      applyTheme(storedTheme)
    } else {
      applyTheme(DEFAULT_THEME)
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    // Remove all theme classes
    root.classList.remove('theme-classic')
    
    // Apply new theme
    if (newTheme === 'classic') {
      root.classList.add('theme-classic')
    }
    
    // Update CSS variables based on theme
    // Ocean Breeze uses default CSS variables (no class needed)
    // Classic theme uses .theme-classic class
  }

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  return {
    theme,
    changeTheme,
    mounted,
  }
}
