/**
 * useAuth Hook - Authentication Management
 * 
 * Provides authentication state and methods for login, logout, signup, and session management.
 * Uses custom backend API with JWT tokens.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, type User } from '@/lib/auth/client'

interface AuthError {
  message: string
}

interface UseAuthReturn {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string, redirectPath?: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const TOKEN_KEY = 'auth_token'

// Helper to set cookie (for middleware to read)
function setAuthCookie(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  }
}

// Helper to remove cookie
function removeAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_token=; path=/; max-age=0'
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load user from token on mount
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      
      if (!token) {
        setLoading(false)
        return
      }

      const userData = await authAPI.getCurrentUser(token)
      setUser(userData)
    } catch (error) {
      // Token is invalid or expired, remove it
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const signIn = async (email: string, password: string, redirectPath?: string) => {
    try {
      const response = await authAPI.login(email, password)
      
      // Store token in localStorage and cookie
      localStorage.setItem(TOKEN_KEY, response.access_token)
      setAuthCookie(response.access_token)
      
      // Set user
      setUser(response.user)
      
      // Redirect to requested path (e.g. after session expiry) or dashboard
      // Only allow relative paths (block //evil.com open redirects)
      const target =
        redirectPath?.startsWith('/') && !redirectPath.startsWith('//')
          ? redirectPath
          : '/dashboard'
      router.push(target)
      router.refresh()
      
      return { error: null }
    } catch (error) {
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Login failed' 
        } 
      }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await authAPI.signup(email, password, fullName)
      
      // Store token in localStorage and cookie
      localStorage.setItem(TOKEN_KEY, response.access_token)
      setAuthCookie(response.access_token)
      
      // Set user
      setUser(response.user)
      
      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
      
      return { error: null }
    } catch (error) {
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Signup failed' 
        } 
      }
    }
  }

  const signOut = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      
      if (token) {
        await authAPI.logout(token)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local state
      localStorage.removeItem(TOKEN_KEY)
      removeAuthCookie()
      setUser(null)
      router.push('/login')
      router.refresh()
    }
  }

  const refreshSession = async () => {
    await loadUser()
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  }
}
