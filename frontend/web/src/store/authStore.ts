import { create } from 'zustand'
import api from '../services/api'

interface Role {
  id: number
  name: string
  description: string | null
}

interface Condominium {
  id: number
  name: string
  property_ids?: number[] | null  // Para titular/residente: unidades asociadas; [] = ninguna, undefined = no aplica
}

interface User {
  id: number
  email: string
  full_name: string | null
  photo_url: string | null
  is_active: boolean
  roles?: Role[]
  condominiums?: Condominium[]
  needs_password_change?: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isSuperAdmin: () => boolean
  isAdmin: () => boolean
  /** True si el usuario tiene rol titular o residente */
  isTitularOrResident: () => boolean
  /** Para titular/residente en un condominio: ids de unidades asociadas. null = no aplica (admin/etc), [] = sin unidad, number[] = solo esas unidades */
  getPropertyIdsForCondominium: (condominiumId: number) => number[] | null
  login: (email: string, password: string) => Promise<boolean>
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

  isAdmin: () => {
    const user = get().user
    return user?.roles?.some(role => role.name === 'super_admin' || role.name === 'admin') || false
  },

  isTitularOrResident: () => {
    const user = get().user
    return user?.roles?.some(role => role.name === 'titular' || role.name === 'residente') || false
  },

  getPropertyIdsForCondominium: (condominiumId: number) => {
    const user = get().user
    if (!user?.condominiums) return null
    const condo = user.condominiums.find(c => c.id === condominiumId)
    if (!condo) return null
    if (!('property_ids' in condo) || condo.property_ids === undefined) return null
    return condo.property_ids
  },

  login: async (email: string, password: string) => {
    try {
      // Step 1: Login and get tokens (password can be empty for new users)
      const response = await api.post('/auth/login', { email, password: password || "" })
      const { access_token, refresh_token, needs_password_change } = response.data
      
      if (!access_token || !refresh_token) {
        throw new Error('No tokens received from server')
      }
      
      // Step 2: Save tokens to localStorage immediately
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      
      // Step 3: Get user info with roles (this will use the token from localStorage via interceptor)
      const userResponse = await api.get('/auth/me')
      
      // Step 4: Use user data with roles and condominiums from /auth/me endpoint
      const userData = {
        ...userResponse.data,
        roles: userResponse.data.roles || [],
        condominiums: userResponse.data.condominiums || [],
        photo_url: userResponse.data.photo_url || null,
        needs_password_change: needs_password_change || userResponse.data.needs_password_change || false
      }
      
      console.log('[AUTH] User logged in:', userData.email, 'roles:', userData.roles, 'condominiums:', userData.condominiums, 'needs_password_change:', userData.needs_password_change)
      
      // Step 5: Update state
      set({ 
        user: userData, 
        isAuthenticated: true 
      })
      
      // Step 6: Return needs_password_change flag
      return needs_password_change || userData.needs_password_change || false
      
      // Step 6: If user has exactly one condominium, save it to localStorage
      if (userData.condominiums && userData.condominiums.length === 1) {
        localStorage.setItem('selectedCondominiumId', userData.condominiums[0].id.toString())
      }
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
      console.log('[AUTH] Auth check successful, user:', userData.email, 'roles:', userData.roles, 'condominiums:', userData.condominiums)
      // Ensure roles and condominiums are included
      const userWithData = {
        ...userData,
        roles: userData.roles || [],
        condominiums: userData.condominiums || [],
        needs_password_change: userData.needs_password_change || false
      }
      set({ 
        user: userWithData, 
        isAuthenticated: true 
      })
      
      // If user has exactly one condominium, save it to localStorage
      if (userWithData.condominiums && userWithData.condominiums.length === 1) {
        localStorage.setItem('selectedCondominiumId', userWithData.condominiums[0].id.toString())
      }
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

