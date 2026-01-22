import { create } from 'zustand'
import api from '../services/api'

interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      // Step 1: Login and get tokens
      const response = await api.post('/auth/login', { email, password })
      const { access_token, refresh_token } = response.data
      
      if (!access_token || !refresh_token) {
        throw new Error('No tokens received from server')
      }
      
      // Step 2: Save tokens to localStorage immediately
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      
      // Step 3: Get user info (this will use the token from localStorage via interceptor)
      const userResponse = await api.get('/auth/me')
      
      // Step 4: Update state
      set({ 
        user: userResponse.data, 
        isAuthenticated: true 
      })
    } catch (error: any) {
      // Clear tokens on error
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ user: null, isAuthenticated: false })
      return
    }
    
    try {
      console.log('[AUTH] Checking authentication with token (length:', token.length, ')')
      // Use fetch directly to avoid interceptor issues during auth check
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[AUTH] Auth check failed:', response.status, errorData)
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          set({ user: null, isAuthenticated: false })
        }
        return
      }
      
      const userData = await response.json()
      console.log('[AUTH] Auth check successful, user:', userData.email)
      set({ user: userData, isAuthenticated: true })
    } catch (error: any) {
      console.error('[AUTH] Auth check error:', error)
      // For network errors, don't clear token
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
      }
    }
  },
}))

