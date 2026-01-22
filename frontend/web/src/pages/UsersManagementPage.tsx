import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
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
  created_at: string
  updated_at: string | null
}

export default function UsersManagementPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role_ids: [] as number[],
    condominium_ids: [] as number[],
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [])

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

  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit)
      setFormData({
        email: userToEdit.email,
        full_name: userToEdit.full_name || '',
        password: '',
        role_ids: userToEdit.roles.map(r => r.id),
        condominium_ids: userToEdit.condominiums.map(c => c.id),
        is_active: userToEdit.is_active
      })
    } else {
      setEditingUser(null)
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role_ids: [],
        condominium_ids: [],
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          email: formData.email,
          full_name: formData.full_name,
          role_ids: formData.role_ids,
          condominium_ids: formData.condominium_ids,
          is_active: formData.is_active
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await api.put(`/users/${editingUser.id}`, updateData)
      } else {
        // Create user
        await api.post('/users/', {
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role_ids: formData.role_ids,
          condominium_ids: formData.condominium_ids
        })
      }
      handleCloseModal()
      loadData()
      alert(editingUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente')
    } catch (error: any) {
      console.error('Error saving user:', error)
      alert('Error: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    
    try {
      await api.delete(`/users/${userId}`)
      loadData()
      alert('Usuario eliminado exitosamente')
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert('Error: ' + (error.response?.data?.detail || error.message))
    }
  }

  const toggleRole = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }))
  }

  const toggleCondominium = (condoId: number) => {
    setFormData(prev => ({
      ...prev,
      condominium_ids: prev.condominium_ids.includes(condoId)
        ? prev.condominium_ids.filter(id => id !== condoId)
        : [...prev.condominium_ids, condoId]
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nuevo Usuario
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condominios
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{u.email}</div>
                    {u.full_name && (
                      <div className="text-sm text-gray-500">{u.full_name}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((role) => (
                      <span
                        key={role.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {u.condominiums.length > 0 ? (
                      u.condominiums.map((condo) => (
                        <span
                          key={condo.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {condo.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">Sin asignar</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(u)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Editar
                  </button>
                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.role_ids.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {role.name} {role.description && `- ${role.description}`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condominios</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {condominiums.map((condo) => (
                      <label key={condo.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.condominium_ids.includes(condo.id)}
                          onChange={() => toggleCondominium(condo.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{condo.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {editingUser && (
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Usuario Activo</span>
                    </label>
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
