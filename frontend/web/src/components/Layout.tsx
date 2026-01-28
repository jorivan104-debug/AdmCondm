import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate, Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { checkAuth, isAuthenticated, isSuperAdmin } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Gestión Condominial</h1>
              <div className="flex space-x-4">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/dashboard'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Dashboard
                </Link>
                {isSuperAdmin() && (
                  <Link
                    to="/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/users'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200'
                        : 'text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Gestión de Usuarios
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  useAuthStore.getState().logout()
                  navigate('/login')
                }}
                className="text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

