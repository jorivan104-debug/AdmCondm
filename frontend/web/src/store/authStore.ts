import { create } from 'zustand'
import api from '../services/api'

interface Role {
  id: number
  name: string
  description: string | null
}

interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  roles?: Role[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isSuperAdmin: () => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  isSuperAdmin: () => {
    const user = get().user
    return user?.roles?.some(role => role.name === 'super_admin') || false
  },

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
      
      // Step 4: Get user details with roles if available
      let userData = userResponse.data
      try {
        // Try to get full user details with roles
        const userDetails = await api.get(`/users/${userResponse.data.id}`)
        userData = userDetails.data
      } catch (e) {
        // If user doesn't have permission, use basic user data
        console.log('Could not fetch user details, using basic info')
      }
      
      // Step 5: Update state
      set({ 
        user: userData, 
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

