/**
 * Theme Switcher Component
 * 
 * Allows users to switch between Ocean Breeze (default) and Classic themes.
 */

'use client'

import { useTheme } from '@/hooks/useTheme'
import { Palette } from 'lucide-react'

export function ThemeSwitcher() {
  const { theme, changeTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-md border border-input bg-background" />
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => changeTheme(theme === 'ocean-breeze' ? 'classic' : 'ocean-breeze')}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Switch theme"
        title={`Current theme: ${theme === 'ocean-breeze' ? 'Ocean Breeze' : 'Classic'}. Click to switch.`}
      >
        <Palette className="h-4 w-4" />
      </button>
      
      {/* Theme indicator tooltip */}
      <div className="absolute right-0 top-full mt-2 hidden rounded-md border border-input bg-popover px-2 py-1 text-xs shadow-md group-hover:block">
        {theme === 'ocean-breeze' ? 'Ocean Breeze' : 'Classic'}
      </div>
    </div>
  )
}
