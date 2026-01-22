import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, refresh_token } = response.data
      await AsyncStorage.setItem('access_token', access_token)
      await AsyncStorage.setItem('refresh_token', refresh_token)

      const userResponse = await api.get('/auth/me')
      set({ user: userResponse.data, isAuthenticated: true })
    } catch (error) {
      throw error
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('access_token')
    await AsyncStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = await AsyncStorage.getItem('access_token')
    if (token) {
      try {
        const response = await api.get('/auth/me')
        set({ user: response.data, isAuthenticated: true })
      } catch (error) {
        await AsyncStorage.removeItem('access_token')
        await AsyncStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
      }
    }
  },
}))

