import { useState, useEffect } from 'react'
import api from '../../services/api'

interface Resident {
  id: number
  condominium_id: number
  full_name: string
  email: string | null
  phone: string | null
  document_type: string | null
  document_number: string | null
  created_at: string
  updated_at: string | null
  properties?: PropertyResident[]
}

interface PropertyResident {
  id: number
  property_id: number
  resident_id: number
  start_date: string
  end_date: string | null
  ownership_percentage: number
  property?: {
    id: number
    code: string
  }
  is_titular?: boolean
}

interface ResidentsListProps {
  condominiumId: number
  /** Si se define, solo residentes asociados a estas propiedades. [] = ninguno (vista vacía). */
  restrictToPropertyIds?: number[]
}

export default function ResidentsList({ condominiumId, restrictToPropertyIds }: ResidentsListProps) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creatingResident, setCreatingResident] = useState(false)

  const visibleResidents =
    restrictToPropertyIds === undefined
      ? residents
      : restrictToPropertyIds.length === 0
        ? []
        : residents.filter((r) =>
            (r.properties ?? []).some((pr: { property_id: number }) => restrictToPropertyIds.includes(pr.property_id))
          )
  const isRestricted = restrictToPropertyIds !== undefined
  
  // Form state
  const [residentFormData, setResidentFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    document_type: '',
    document_number: '',
    photo: null as File | null
  })

  useEffect(() => {
    loadResidents()
  }, [condominiumId])

  const loadResidents = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/residents/condominium/${condominiumId}`)
      setResidents(response.data)
    } catch (err: any) {
      console.error('Error loading residents:', err)
      setError('Error al cargar los residentes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingResident(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('condominium_id', condominiumId.toString())
      formDataToSend.append('full_name', residentFormData.full_name)
      if (residentFormData.email) formDataToSend.append('email', residentFormData.email)
      if (residentFormData.phone) formDataToSend.append('phone', residentFormData.phone)
      if (residentFormData.document_type) formDataToSend.append('document_type', residentFormData.document_type)
      if (residentFormData.document_number) formDataToSend.append('document_number', residentFormData.document_number)
      if (residentFormData.photo) formDataToSend.append('photo', residentFormData.photo)

      await api.post('/residents/create-complete', formDataToSend)
      
      // Reset form
      setResidentFormData({
        full_name: '',
        email: '',
        phone: '',
        document_type: '',
        document_number: '',
        photo: null
      })
      setShowCreateForm(false)
      
      // Reload residents
      await loadResidents()
    } catch (err: any) {
      console.error('Error creating resident:', err)
      setError(err.response?.data?.detail || 'Error al crear el residente')
    } finally {
      setCreatingResident(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Residentes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">Lista de todos los residentes del condominio</p>
        </div>
        {!isRestricted && (
        <button 
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Residente
        </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {residents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay residentes</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-200">
            {restrictToPropertyIds?.length === 0 ? 'No tiene unidades asociadas.' : 'Comienza agregando un nuevo residente.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleResidents.map((resident) => (
            <div
              key={resident.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{resident.full_name}</h3>
                    {resident.properties && resident.properties.some(p => p.is_titular) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
                        Titular
                      </span>
                    )}
                  </div>
                  {resident.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">{resident.email}</p>
                  )}
                  {resident.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-200">{resident.phone}</p>
                  )}
                  {resident.document_number && (
                    <p className="text-sm text-gray-500 dark:text-gray-200 mt-1">
                      {resident.document_type || 'Doc'}: {resident.document_number}
                    </p>
                  )}
                  {resident.properties && resident.properties.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-white mb-1">Propiedades:</p>
                      <div className="flex flex-wrap gap-2">
                        {resident.properties.map((pr) => (
                          <span
                            key={pr.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            {pr.property?.code || `Propiedad ${pr.property_id}`}
                            {pr.is_titular && ' (Titular)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de creación */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-black/60 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Residente</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateResident} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre Completo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={residentFormData.full_name}
                    onChange={(e) => setResidentFormData({ ...residentFormData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nombre completo del residente"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={residentFormData.email}
                    onChange={(e) => setResidentFormData({ ...residentFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="email@ejemplo.com"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={residentFormData.phone}
                    onChange={(e) => setResidentFormData({ ...residentFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                {/* Tipo de Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={residentFormData.document_type}
                    onChange={(e) => setResidentFormData({ ...residentFormData, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>

                {/* Número de Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Número de Documento
                  </label>
                  <input
                    type="text"
                    value={residentFormData.document_number}
                    onChange={(e) => setResidentFormData({ ...residentFormData, document_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="1234567890"
                  />
                </div>

                {/* Foto */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Foto
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setResidentFormData({ ...residentFormData, photo: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {residentFormData.photo && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{residentFormData.photo.name}</p>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={creatingResident}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingResident}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {creatingResident ? 'Guardando...' : 'Crear Residente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

