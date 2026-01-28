import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import CondominiumSelectionPage from './pages/CondominiumSelectionPage'
import CondominiumPage from './pages/CondominiumPage'
import DashboardPage from './pages/DashboardPage'
import UsersManagementPage from './pages/UsersManagementPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import Layout from './components/Layout'

function App() {
  const { isAuthenticated, checkAuth, user } = useAuthStore()
  const selectedCondominiumId = localStorage.getItem('selectedCondominiumId')

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      // Check auth and wait for it to complete
      checkAuth().catch((err) => {
        console.warn('Auth check failed on mount:', err)
      })
    }
  }, []) // Only run once on mount - checkAuth is stable from Zustand

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <LoginPage />
            ) : (
              user?.condominiums && user.condominiums.length === 1 ? (
                <Navigate to={`/condominium/${user.condominiums[0].id}`} replace />
              ) : (
                <Navigate to="/condominiums" replace />
              )
            )
          } 
        />
        <Route
          path="/condominiums"
          element={
            isAuthenticated ? (
              user?.condominiums && user.condominiums.length === 1 ? (
                <Navigate to={`/condominium/${user.condominiums[0].id}`} replace />
              ) : (
                <CondominiumSelectionPage />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <SettingsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <ProfilePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/condominium/:id"
          element={
            isAuthenticated ? (
              <CondominiumPage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              selectedCondominiumId ? (
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/users" element={<UsersManagementPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/" element={<Navigate to={`/condominium/${selectedCondominiumId}`} />} />
                    <Route path="*" element={<Navigate to={`/condominium/${selectedCondominiumId}`} />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/condominiums" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

