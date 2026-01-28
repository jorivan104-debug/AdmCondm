import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import PasswordChangeModal from '../components/PasswordChangeModal'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const { login, isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        // If user has exactly one condominium, go directly to it
        if (user?.condominiums && user.condominiums.length === 1) {
          const condominiumId = user.condominiums[0].id
          localStorage.setItem('selectedCondominiumId', condominiumId.toString())
          navigate(`/condominium/${condominiumId}`, { replace: true })
        } else {
          // Otherwise go to condominium selection
          navigate('/condominiums', { replace: true })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const needsPasswordChange = await login(email, password)
      if (needsPasswordChange) {
        setShowPasswordModal(true)
      }
      // Navigation will happen via useEffect when isAuthenticated changes (if password is set)
    } catch (err: any) {
      console.error('Login failed:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Error al iniciar sesión'
      console.error('Error message:', errorMessage)
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChangeSuccess = async () => {
    setShowPasswordModal(false)
    // Small delay to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 200))
    // Navigate based on user condominiums
    if (user?.condominiums && user.condominiums.length === 1) {
      const condominiumId = user.condominiums[0].id
      localStorage.setItem('selectedCondominiumId', condominiumId.toString())
      navigate(`/condominium/${condominiumId}`, { replace: true })
    } else {
      navigate('/condominiums', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Sistema de Gestión Condominial
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-200">
            Inicia sesión en tu cuenta
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña (opcional para usuarios nuevos)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-200">Si es tu primer inicio de sesión, deja este campo vacío</p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  )
}

