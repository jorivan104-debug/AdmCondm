import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

interface Condominium {
  id: number
  name: string
  short_name: string | null
  address: string | null
  city: string | null
  logo_url: string | null
  landscape_image_url: string | null
  administrator_name: string | null
}

export default function CondominiumSelectionPage() {
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCondominium, setEditingCondominium] = useState<Condominium | null>(null)
  const [deletingCondominium, setDeletingCondominium] = useState<Condominium | null>(null)
  const navigate = useNavigate()
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    // Wait a moment for App.tsx to check auth, then load condominiums
    const timer = setTimeout(() => {
      loadCondominiums()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const loadCondominiums = async () => {
    try {
      // Use api instead of fetch to leverage interceptors
      // Always use trailing slash to avoid 307 redirect that loses Authorization header
      const response = await api.get('/condominiums/')
      setCondominiums(response.data)
    } catch (error: any) {
      console.error('Error loading condominiums:', error)
      // Error handling is done by the interceptor
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCondominium = (condominiumId: number) => {
    localStorage.setItem('selectedCondominiumId', condominiumId.toString())
    navigate(`/condominium/${condominiumId}`)
  }

  const handleEditClick = (e: React.MouseEvent, condominium: Condominium) => {
    e.stopPropagation()
    // Show confirmation dialog before editing
    if (window.confirm(`¿Está seguro que desea editar el condominio "${condominium.name}"? Recuerde que esta acción no es reversible.`)) {
      setEditingCondominium(condominium)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, condominium: Condominium) => {
    e.stopPropagation()
    setDeletingCondominium(condominium)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingCondominium) return

    try {
      await api.delete(`/condominiums/${deletingCondominium.id}`)
      setDeletingCondominium(null)
      loadCondominiums()
    } catch (error) {
      console.error('Error deleting condominium:', error)
      alert('Error al eliminar el condominio')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando condominios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Selecciona un Condominio
          </h1>
          <p className="text-lg text-gray-600">
            Elige el condominio con el que deseas trabajar
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors"
          >
            + Crear Nuevo Condominio
          </button>
        </div>

        {condominiums.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-24 w-24"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No tienes condominios
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza creando tu primer condominio
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-md transition-colors"
            >
              Crear Condominio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {condominiums.map((condominium) => (
              <div
                key={condominium.id}
                onClick={() => handleSelectCondominium(condominium.id)}
                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
              >
                {condominium.landscape_image_url ? (
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(http://localhost:8000${condominium.landscape_image_url})`,
                    }}
                  />
                ) : (
                  <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <svg
                      className="h-20 w-20 text-white opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    {condominium.logo_url ? (
                      <img
                        src={`http://localhost:8000${condominium.logo_url}`}
                        alt={condominium.name}
                        className="h-12 w-12 rounded-lg object-cover mr-3"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-bold text-lg">
                          {condominium.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {condominium.short_name || condominium.name}
                      </h3>
                      {condominium.short_name && (
                        <p className="text-sm text-gray-500">{condominium.name}</p>
                      )}
                    </div>
                  </div>
                  {condominium.address && (
                    <p className="text-gray-600 text-sm mb-2">
                      📍 {condominium.address}
                      {condominium.city && `, ${condominium.city}`}
                    </p>
                  )}
                  {condominium.administrator_name && (
                    <p className="text-gray-500 text-sm mb-4">
                      👤 {condominium.administrator_name}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={(e) => handleEditClick(e, condominium)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, condominium)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateForm && (
          <CondominiumForm
            onClose={() => {
              setShowCreateForm(false)
              loadCondominiums()
            }}
            onSuccess={(condominium) => {
              // Navigation is handled inside handleSubmit
              setShowCreateForm(false)
            }}
          />
        )}

        {editingCondominium && (
          <CondominiumForm
            condominium={editingCondominium}
            onClose={() => {
              setEditingCondominium(null)
              loadCondominiums()
            }}
            onSuccess={() => {
              setEditingCondominium(null)
              loadCondominiums()
            }}
          />
        )}

        {deletingCondominium && (
          <ConfirmDialog
            title="Eliminar Condominio"
            message={`¿Está seguro que desea eliminar el condominio "${deletingCondominium.name}"? Recuerde que esta acción no es reversible.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeletingCondominium(null)}
            confirmButtonClass="bg-red-600 hover:bg-red-700"
          />
        )}
      </div>
    </div>
  )
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonClass = "bg-indigo-600 hover:bg-indigo-700",
}: {
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
  confirmButtonClass?: string
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-700 mb-6">{message}</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-md transition-colors ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CondominiumForm({
  condominium,
  onClose,
  onSuccess,
}: {
  condominium?: Condominium
  onClose: () => void
  onSuccess: (condominium: Condominium) => void
}) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const isEditing = !!condominium
  const [formData, setFormData] = useState({
    name: condominium?.name || '',
    short_name: condominium?.short_name || '',
    address: condominium?.address || '',
    city: condominium?.city || '',
    state: condominium?.state || '',
    country: condominium?.country || '',
    postal_code: condominium?.postal_code || '',
    phone: condominium?.phone || '',
    email: condominium?.email || '',
    nit: condominium?.nit || '',
    administrator_name: condominium?.administrator_name || '',
    administrator_phone: condominium?.administrator_phone || '',
    administrator_email: condominium?.administrator_email || '',
    description: condominium?.description || '',
    total_units: condominium?.total_units?.toString() || '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [landscapeFile, setLandscapeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Verify token exists before making request
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('No estás autenticado. Por favor, inicia sesión nuevamente.')
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 2000)
        setLoading(false)
        return
      }

      console.log('[FORM] Creating/updating condominium with token (length:', token.length, ')')

      let updatedCondominium: Condominium

      if (isEditing && condominium) {
        // Update existing condominium
        const updateData = { ...formData }
        if (updateData.total_units) {
          updateData.total_units = parseInt(updateData.total_units as any) as any
        } else {
          delete updateData.total_units
        }
        console.log('[FORM] Updating condominium:', condominium.id)
        const response = await api.put(`/condominiums/${condominium.id}`, updateData)
        updatedCondominium = response.data
      } else {
        // Create new condominium
        const createData = { ...formData }
        if (createData.total_units) {
          createData.total_units = parseInt(createData.total_units as any) as any
        } else {
          delete createData.total_units
        }
        console.log('[FORM] Creating condominium with data:', createData)
        const response = await api.post('/condominiums/', createData)
        console.log('[FORM] Condominium created successfully:', response.data)
        updatedCondominium = response.data
      }

      // Upload logo if provided
      if (logoFile && updatedCondominium) {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)
        await api.post(`/condominiums/${updatedCondominium.id}/upload-logo`, logoFormData)
      }

      // Upload landscape image if provided
      if (landscapeFile && updatedCondominium) {
        const landscapeFormData = new FormData()
        landscapeFormData.append('file', landscapeFile)
        await api.post(`/condominiums/${updatedCondominium.id}/upload-landscape`, landscapeFormData)
      }

      // After successful creation/update, navigate to condominium page
      if (updatedCondominium) {
        localStorage.setItem('selectedCondominiumId', updatedCondominium.id.toString())
        // Close the form first
        onClose()
        // Call onSuccess callback
        onSuccess(updatedCondominium)
        // Navigate using React Router (preserves auth state)
        navigate(`/condominium/${updatedCondominium.id}`, { replace: true })
      }
    } catch (err: any) {
      console.error('[FORM] Error creating/updating condominium:', err)
      console.error('[FORM] Error response:', err.response?.data)
      console.error('[FORM] Error status:', err.response?.status)
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        const errorDetail = err.response?.data?.detail || 'Error de autenticación'
        setError(`Error de autenticación: ${errorDetail}. Por favor, verifica tu sesión e intenta nuevamente.`)
        
        // Check if token refresh was attempted
        if (err.config?._retry) {
          // Token refresh failed, user needs to login again
          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 3000)
        }
      } else {
        // Other errors
        const errorMessage = err.response?.data?.detail || err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el condominio`
        setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Condominio' : 'Crear Nuevo Condominio'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Abreviado
              </label>
              <input
                type="text"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado/Departamento
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                País
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIT
            </label>
            <input
              type="text"
              value={formData.nit}
              onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Administrador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Administrador
                </label>
                <input
                  type="text"
                  value={formData.administrator_name}
                  onChange={(e) => setFormData({ ...formData, administrator_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono del Administrador
                </label>
                <input
                  type="tel"
                  value={formData.administrator_phone}
                  onChange={(e) => setFormData({ ...formData, administrator_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email del Administrador
                </label>
                <input
                  type="email"
                  value={formData.administrator_email}
                  onChange={(e) => setFormData({ ...formData, administrator_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total de Unidades
            </label>
            <input
              type="number"
              value={formData.total_units}
              onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen Paisajística
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLandscapeFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (isEditing ? 'Actualizando...' : 'Creando...') : (isEditing ? 'Actualizar Condominio' : 'Crear Condominio')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

