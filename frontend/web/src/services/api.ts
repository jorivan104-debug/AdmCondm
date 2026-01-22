import axios from 'axios'

// Get API URL from environment variable or use relative path
const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: any) => {
    // Always get fresh token from localStorage
    const token = localStorage.getItem('access_token')
    
    if (token) {
      // Ensure Authorization header is set correctly
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
      console.log(`[API] Request to ${config.url}: Token added (length: ${token.length})`)
    } else {
      console.warn(`[API] Request to ${config.url}: No token found`)
    }
    
    // Handle FormData - don't set Content-Type, let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401) {
      // Skip handling for auth endpoints (login, register, me, refresh)
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/me') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest._retry) {
        // For auth endpoints, just reject - don't redirect
        return Promise.reject(error)
      }

      // Try to refresh token
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      
      if (refreshToken) {
        try {
          console.log('[API] Attempting to refresh token...')
          // Use axios directly (not api) to avoid interceptor loop
          const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
          const { access_token, refresh_token: new_refresh_token } = response.data
          
          // Save new tokens immediately
          localStorage.setItem('access_token', access_token)
          if (new_refresh_token) {
            localStorage.setItem('refresh_token', new_refresh_token)
          }
          console.log('[API] Token refreshed successfully, new token length:', access_token.length)
          
          // Update the original request with new token
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          
          // Mark that we've already retried to prevent infinite loop
          originalRequest._retry = true
          // Retry the original request - the interceptor will use the new token from localStorage
          return api(originalRequest)
        } catch (refreshError: any) {
          console.error('[API] Token refresh failed:', refreshError.response?.status, refreshError.response?.data)
          // Refresh failed - clear tokens
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('selectedCondominiumId')
          return Promise.reject(error) // Return original error, not refresh error
        }
      } else {
        console.warn('[API] No refresh token available')
        // No refresh token - clear tokens
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('selectedCondominiumId')
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
