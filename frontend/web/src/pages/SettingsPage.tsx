import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import api from '../services/api'

interface Role {
  id: number
  name: string
  description: string | null
}

interface Condominium {
  id: number
  name: string
}

interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  roles: Role[]
  condominiums: Condominium[]
}

type SettingsSection = 'users' | 'condominiums' | 'roles' | 'visual'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, isSuperAdmin, isAdmin } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('users')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)
  const [resettingPassword, setResettingPassword] = useState<number | null>(null)
  const [tempPassword, setTempPassword] = useState<{userId: number, password: string} | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserData, setCreateUserData] = useState({
    email: '',
    full_name: '',
    role_id: '',
    condominium_id: ''
  })
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    condominium: ''
  })
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  useEffect(() => {
    if (isSuperAdmin()) {
      loadData()
    }
  }, [isSuperAdmin])

  useEffect(() => {
    applyFilters()
  }, [users, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes, condosRes] = await Promise.all([
        api.get('/users/'),
        api.get('/users/roles/all'),
        api.get('/condominiums/')
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
      setCondominiums(condosRes.data)
    } catch (error: any) {
      console.error('Error loading data:', error)
      alert('Error al cargar datos: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    // Search filter (email or name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(searchLower) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchLower))
      )
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(u => 
        u.roles.some(r => r.id === parseInt(filters.role))
      )
    }

    // Status filter
    if (filters.status) {
      const isActive = filters.status === 'active'
      filtered = filtered.filter(u => u.is_active === isActive)
    }

    // Condominium filter
    if (filters.condominium) {
      const condoId = parseInt(filters.condominium)
      filtered = filtered.filter(u => 
        u.condominiums.some(c => c.id === condoId)
      )
    }

    setFilteredUsers(filtered)
  }

  const handleResetPassword = async (userId: number) => {
    if (!confirm('¿Está seguro que desea reiniciar la contraseña de este usuario?')) {
      return
    }

    try {
      setResettingPassword(userId)
      const response = await api.post(`/users/${userId}/reset-password`)
      const tempPass = response.data.temp_password || 'Generada automáticamente'
      setTempPassword({ userId, password: tempPass })
      alert(`Contraseña reiniciada. Nueva contraseña temporal: ${tempPass}`)
      await loadData()
    } catch (error: any) {
      console.error('Error resetting password:', error)
      alert('Error al reiniciar contraseña: ' + (error.response?.data?.detail || error.message))
    } finally {
      setResettingPassword(null)
    }
  }

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) return

    // Prevent deactivating super admin
    if (targetUser.email === 'jorivan104@hotmail.com') {
      alert('No se puede desactivar al superadministrador principal')
      return
    }

    const action = currentStatus ? 'desactivar' : 'activar'
    if (!confirm(`¿Está seguro que desea ${action} este usuario?`)) {
      return
    }

    try {
      await api.put(`/users/${userId}`, {
        is_active: !currentStatus
      })
      await loadData()
      alert(`Usuario ${currentStatus ? 'desactivado' : 'activado'} exitosamente`)
    } catch (error: any) {
      console.error('Error updating user status:', error)
      alert('Error al actualizar estado: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCondominiumChange = async (userId: number, condominiumId: number | null) => {
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) return

    // Super admin cannot be assigned to a condominium
    if (targetUser.email === 'jorivan104@hotmail.com') {
      alert('El superadministrador no puede ser asignado a un condominio específico')
      return
    }

    try {
      await api.put(`/users/${userId}`, {
        condominium_ids: condominiumId ? [condominiumId] : []
      })
      await loadData()
    } catch (error: any) {
      console.error('Error updating user condominium:', error)
      alert('Error al actualizar condominio: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleRoleChange = async (userId: number, newRoleId: number) => {
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) return

    // Check if user is jorivan104@hotmail.com (super admin)
    if (targetUser.email === 'jorivan104@hotmail.com') {
      alert('No se puede modificar el rol del superadministrador principal')
      return
    }

    // Get super_admin role
    const superAdminRole = roles.find(r => r.name === 'super_admin')
    if (!superAdminRole) return

    // Prevent assigning super_admin to anyone
    if (newRoleId === superAdminRole.id) {
      alert('El rol de Superadministrador no puede ser asignado')
      return
    }

    // Get the new role
    const newRole = roles.find(r => r.id === newRoleId)
    if (!newRole) return

    // Check permissions based on role
    if (newRole.name === 'admin' && !isSuperAdmin()) {
      alert('Solo el superadministrador puede asignar el rol de Administrador')
      return
    }

    // Replace all roles with the new single role (users have one primary role)
    try {
      await api.put(`/users/${userId}`, {
        role_ids: [newRoleId]
      })
      await loadData()
    } catch (error: any) {
      console.error('Error updating user role:', error)
      alert('Error al actualizar rol: ' + (error.response?.data?.detail || error.message))
    }
  }

  const canAssignRole = (roleName: string): boolean => {
    if (!isSuperAdmin()) return false
    
    // Super admin can assign all roles except super_admin
    if (roleName === 'super_admin') return false
    
    // Super admin can assign admin, asesor, titular, residente
    return ['admin', 'asesor', 'titular', 'residente'].includes(roleName)
  }

  const getRoleDisplayName = (roleName: string): string => {
    const roleNames: { [key: string]: string } = {
      'super_admin': 'Superadministrador',
      'admin': 'Administrador',
      'asesor': 'Asesor',
      'titular': 'Titular',
      'residente': 'Residente',
      'accountant': 'Contador',
      'accounting_assistant': 'Asistente Contable',
      'user': 'Usuario'
    }
    return roleNames[roleName] || roleName
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg">
          No tienes permisos para acceder a esta página.
        </div>
      </div>
    )
  }

  const handleCreateUser = async () => {
    if (!createUserData.email) {
      alert('El email es requerido')
      return
    }

    try {
      const payload: any = {
        email: createUserData.email,
        role_ids: createUserData.role_id ? [parseInt(createUserData.role_id)] : [],
        condominium_ids: createUserData.condominium_id ? [parseInt(createUserData.condominium_id)] : []
      }
      
      // Only include full_name if provided
      if (createUserData.full_name) {
        payload.full_name = createUserData.full_name
      }
      
      // Don't send password field at all for new users (they'll set it on first login)
      // The backend will handle None/null password correctly
      
      await api.post('/users/', payload)
      setShowCreateUserModal(false)
      setCreateUserData({ email: '', full_name: '', role_id: '', condominium_id: '' })
      await loadData()
      alert('Usuario creado exitosamente. El usuario deberá establecer su contraseña en el primer inicio de sesión.')
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert('Error al crear usuario: ' + (error.response?.data?.detail || error.message))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-900 dark:text-gray-100">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar Menu */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col border-r border-gray-200 dark:border-gray-700">
        {/* Back Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => navigate('/condominiums')}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100 font-medium py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-2">
          <button
            onClick={() => setActiveSection('users')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-2 ${
              activeSection === 'users'
                ? 'bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-900/40 dark:text-indigo-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Control de Usuarios
          </button>
          <button
            onClick={() => setActiveSection('visual')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors mb-2 ${
              activeSection === 'visual'
                ? 'bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-900/40 dark:text-indigo-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Configuración visual
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeSection === 'visual' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Configuración visual
              </h2>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Modo de color
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-200 mt-0.5">
                      Cambia entre tema claro y oscuro para toda la aplicación
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'light'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      Claro
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      Oscuro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Control de Usuarios</h2>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  + Crear Usuario
                </button>
              </div>
              
              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                      Buscar
                    </label>
                    <input
                      type="text"
                      placeholder="Email o nombre..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                      Rol
                    </label>
                    <select
                      value={filters.role}
                      onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Todos</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {getRoleDisplayName(role.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                      Estado
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Todos</option>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                      Condominio
                    </label>
                    <select
                      value={filters.condominium}
                      onChange={(e) => setFilters({ ...filters, condominium: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Todos</option>
                      {condominiums.map((condo) => (
                        <option key={condo.id} value={condo.id}>
                          {condo.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                          Condominio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredUsers.map((userItem) => (
                        <tr key={userItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{userItem.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-200">{userItem.full_name || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              userItem.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-2 h-2 rounded-full mr-1.5 ${
                                userItem.is_active ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              {userItem.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={userItem.roles[0]?.id || ''}
                              onChange={(e) => {
                                const newRoleId = parseInt(e.target.value)
                                if (newRoleId) {
                                  handleRoleChange(userItem.id, newRoleId)
                                }
                              }}
                              disabled={userItem.email === 'jorivan104@hotmail.com'}
                              className="text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Seleccionar rol</option>
                              {roles
                                .filter(r => {
                                  // Show current role even if can't assign
                                  if (userItem.roles.some(ur => ur.id === r.id)) return true
                                  // Filter by permissions
                                  return canAssignRole(r.name)
                                })
                                .map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {getRoleDisplayName(role.name)}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={userItem.condominiums[0]?.id || ''}
                              onChange={(e) => {
                                const condominiumId = e.target.value ? parseInt(e.target.value) : null
                                handleCondominiumChange(userItem.id, condominiumId)
                              }}
                              disabled={userItem.email === 'jorivan104@hotmail.com'}
                              className="text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Sin asignar</option>
                              {condominiums.map((condo) => (
                                <option key={condo.id} value={condo.id}>
                                  {condo.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              {/* Reset Password Button */}
                              <button
                                onClick={() => handleResetPassword(userItem.id)}
                                disabled={resettingPassword === userItem.id}
                                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 relative group"
                                title="Reiniciar Contraseña del usuario"
                              >
                                {resettingPassword === userItem.id ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Reiniciar Contraseña del usuario
                                </span>
                              </button>

                              {/* Toggle Status Button */}
                              <button
                                onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                                disabled={userItem.email === 'jorivan104@hotmail.com'}
                                className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative group ${
                                  userItem.is_active
                                    ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                    : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                }`}
                                title={userItem.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              >
                                {userItem.is_active ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  {userItem.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-200">
                      No se encontraron usuarios con los filtros aplicados
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Crear Nuevo Usuario</h3>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false)
                    setCreateUserData({ email: '', full_name: '', role_id: '', condominium_id: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createUserData.email}
                    onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={createUserData.full_name}
                    onChange={(e) => setCreateUserData({ ...createUserData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Rol
                  </label>
                  <select
                    value={createUserData.role_id}
                    onChange={(e) => setCreateUserData({ ...createUserData, role_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Seleccionar rol</option>
                    {roles
                      .filter(r => canAssignRole(r.name))
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {getRoleDisplayName(role.name)}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Condominio
                  </label>
                  <select
                    value={createUserData.condominium_id}
                    onChange={(e) => setCreateUserData({ ...createUserData, condominium_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sin asignar</option>
                    {condominiums.map((condo) => (
                      <option key={condo.id} value={condo.id}>
                        {condo.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-200">
                  El usuario podrá iniciar sesión solo con su email y deberá establecer su contraseña en el primer inicio.
                </p>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateUserModal(false)
                      setCreateUserData({ email: '', full_name: '', role_id: '', condominium_id: '' })
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateUser}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Crear Usuario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
