import { useState, useEffect } from 'react'
import api from '../../services/api'

interface Block {
  id: number
  condominium_id: number
  name: string
  description?: string | null
}

interface PropertyResidentResponse {
  id: number
  property_id: number
  resident_id: number
  ownership_percentage: number
  resident?: {
    id: number
    full_name: string
    email: string | null
    phone: string | null
  }
}

interface Property {
  id: number
  condominium_id: number
  code: string
  type: string
  block_id?: number | null
  block?: Block | null
  area: number | null
  description?: string | null
  photo_url?: string | null
  property_residents?: PropertyResidentResponse[]
  created_at: string
  updated_at: string | null
}

interface Resident {
  id: number
  condominium_id: number
  full_name: string
  email: string | null
  phone: string | null
  document_type: string | null
  document_number: string | null
}

interface ResidentAssignment {
  resident_id: number
  is_owner: boolean
  ownership_percentage: number
}

interface PropertiesListProps {
  condominiumId: number
}

// Función para traducir tipos de unidad al español
const getPropertyTypeLabel = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    apartment: 'Apartamento',
    house: 'Casa',
    commercial: 'Local Comercial',
    parking: 'Parqueadero',
    storage: 'Bodega'
  }
  return typeMap[type] || type
}

export default function PropertiesList({ condominiumId }: PropertiesListProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showBlocksForm, setShowBlocksForm] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<number | null>(null)
  
  // Block form state
  const [blockFormData, setBlockFormData] = useState({ name: '', description: '' })
  const [creatingBlock, setCreatingBlock] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null)
  const [deletingBlockId, setDeletingBlockId] = useState<number | null>(null)
  
  // Edit property state
  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({
    code: '',
    block_id: '',
    type: 'apartment',
    area: '',
    description: '',
    photo: null as File | null
  })
  const [editSelectedResidents, setEditSelectedResidents] = useState<ResidentAssignment[]>([])
  const [updating, setUpdating] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    block_id: '',
    type: 'apartment',
    area: '',
    description: '',
    photo: null as File | null,
    selectedResidents: [] as ResidentAssignment[]
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Resident form state
  const [showResidentForm, setShowResidentForm] = useState(false)
  const [residentFormData, setResidentFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    document_type: '',
    document_number: '',
    photo: null as File | null
  })
  const [creatingResident, setCreatingResident] = useState(false)

  useEffect(() => {
    loadProperties()
    loadResidents()
    loadBlocks()
  }, [condominiumId])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/properties/condominium/${condominiumId}`)
      setProperties(response.data)
    } catch (err: any) {
      console.error('Error loading properties:', err)
      setError('Error al cargar las unidades')
    } finally {
      setLoading(false)
    }
  }

  const loadResidents = async () => {
    try {
      const response = await api.get(`/residents/condominium/${condominiumId}`)
      setResidents(response.data)
    } catch (err: any) {
      console.error('Error loading residents:', err)
    }
  }

  const loadBlocks = async () => {
    try {
      const response = await api.get(`/blocks/condominium/${condominiumId}`)
      setBlocks(response.data)
    } catch (err: any) {
      console.error('Error loading blocks:', err)
    }
  }

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingBlock(true)
    setError('')

    try {
      await api.post('/blocks/', {
        condominium_id: condominiumId,
        name: blockFormData.name,
        description: blockFormData.description || null
      })
      
      setBlockFormData({ name: '', description: '' })
      await loadBlocks()
    } catch (err: any) {
      console.error('Error creating block:', err)
      setError(err.response?.data?.detail || 'Error al crear el bloque')
    } finally {
      setCreatingBlock(false)
    }
  }

  const handleEditBlock = (block: Block) => {
    setEditingBlockId(block.id)
    setBlockFormData({ name: block.name, description: block.description || '' })
  }

  const handleUpdateBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBlockId) return
    
    setCreatingBlock(true)
    setError('')

    try {
      await api.put(`/blocks/${editingBlockId}`, {
        name: blockFormData.name,
        description: blockFormData.description || null
      })
      
      setBlockFormData({ name: '', description: '' })
      setEditingBlockId(null)
      await loadBlocks()
    } catch (err: any) {
      console.error('Error updating block:', err)
      setError(err.response?.data?.detail || 'Error al actualizar el bloque')
    } finally {
      setCreatingBlock(false)
    }
  }

  const handleDeleteBlock = async (blockId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este bloque? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await api.delete(`/blocks/${blockId}`)
      await loadBlocks()
      setDeletingBlockId(null)
    } catch (err: any) {
      console.error('Error deleting block:', err)
      setError(err.response?.data?.detail || 'Error al eliminar el bloque')
      setDeletingBlockId(null)
    }
  }

  const handleEditProperty = (property: Property) => {
    setEditingPropertyId(property.id)
    setEditFormData({
      code: property.code,
      block_id: property.block_id?.toString() || '',
      type: property.type,
      area: property.area?.toString() || '',
      description: property.description || '',
      photo: null
    })
    // Load existing residents for this property
    if (property.property_residents) {
      const existingResidents = property.property_residents.map(pr => ({
        resident_id: pr.resident_id,
        is_owner: pr.ownership_percentage === 100.0,
        ownership_percentage: pr.ownership_percentage
      }))
      setEditSelectedResidents(existingResidents)
    } else {
      setEditSelectedResidents([])
    }
  }

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPropertyId) return
    
    setUpdating(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('code', editFormData.code)
      formDataToSend.append('type', editFormData.type)
      if (editFormData.block_id) formDataToSend.append('block_id', editFormData.block_id)
      if (editFormData.area) formDataToSend.append('area', editFormData.area)
      if (editFormData.description) formDataToSend.append('description', editFormData.description)
      if (editFormData.photo) formDataToSend.append('photo', editFormData.photo)
      
      // Add residents if any are selected
      if (editSelectedResidents.length > 0) {
        formDataToSend.append('residents_json', JSON.stringify(editSelectedResidents))
      } else {
        formDataToSend.append('residents_json', '')  // Empty string to clear residents
      }

      await api.put(`/properties/update-complete/${editingPropertyId}`, formDataToSend)
      
      setEditFormData({
        code: '',
        block_id: '',
        type: 'apartment',
        area: '',
        description: '',
        photo: null
      })
      setEditingPropertyId(null)
      await loadProperties()
    } catch (err: any) {
      console.error('Error updating property:', err)
      setError(err.response?.data?.detail || 'Error al actualizar la unidad')
    } finally {
      setUpdating(false)
    }
  }

  const cancelEditBlock = () => {
    setEditingBlockId(null)
    setBlockFormData({ name: '', description: '' })
  }

  const cancelEditProperty = () => {
    setEditingPropertyId(null)
    setEditFormData({
      code: '',
      block_id: '',
      type: 'apartment',
      area: '',
      description: '',
      photo: null
    })
    setEditSelectedResidents([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('condominium_id', condominiumId.toString())
      formDataToSend.append('code', formData.code)
      formDataToSend.append('type', formData.type)
      if (formData.block_id) formDataToSend.append('block_id', formData.block_id)
      if (formData.area) formDataToSend.append('area', formData.area)
      if (formData.description) formDataToSend.append('description', formData.description)
      if (formData.photo) formDataToSend.append('photo', formData.photo)
      if (formData.selectedResidents.length > 0) {
        formDataToSend.append('residents_json', JSON.stringify(formData.selectedResidents))
      }

      await api.post('/properties/create-complete', formDataToSend)
      
      // Reset form
      setFormData({
        code: '',
        block_id: '',
        type: 'apartment',
        area: '',
        description: '',
        photo: null,
        selectedResidents: []
      })
      setShowCreateForm(false)
      loadProperties()
    } catch (err: any) {
      console.error('Error creating property:', err)
      setError(err.response?.data?.detail || 'Error al crear la unidad')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResidentToggle = (residentId: number) => {
    const existing = formData.selectedResidents.find(r => r.resident_id === residentId)
    if (existing) {
      setFormData({
        ...formData,
        selectedResidents: formData.selectedResidents.filter(r => r.resident_id !== residentId)
      })
    } else {
      setFormData({
        ...formData,
        selectedResidents: [...formData.selectedResidents, {
          resident_id: residentId,
          is_owner: false,
          ownership_percentage: 0
        }]
      })
    }
  }

  const handleOwnerToggle = (residentId: number) => {
    setFormData({
      ...formData,
      selectedResidents: formData.selectedResidents.map(r => {
        if (r.resident_id === residentId) {
          return { ...r, is_owner: !r.is_owner, ownership_percentage: !r.is_owner ? 100 : 0 }
        }
        // Si se marca como titular, desmarcar los demás
        if (!r.is_owner && r.resident_id !== residentId) {
          return r
        }
        return r.is_owner ? { ...r, is_owner: false, ownership_percentage: 0 } : r
      })
    })
  }

  const getResidentName = (residentId: number) => {
    const resident = residents.find(r => r.id === residentId)
    return resident?.full_name || 'Residente desconocido'
  }

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

      const response = await api.post('/residents/create-complete', formDataToSend)
      
      // Reset form
      setResidentFormData({
        full_name: '',
        email: '',
        phone: '',
        document_type: '',
        document_number: '',
        photo: null
      })
      setShowResidentForm(false)
      
      // Reload residents and add to selected if needed
      await loadResidents()
      
      // Optionally auto-select the new resident
      const newResident = response.data
      setFormData({
        ...formData,
        selectedResidents: [...formData.selectedResidents, {
          resident_id: newResident.id,
          is_owner: false,
          ownership_percentage: 0
        }]
      })
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

  // Filter properties by block
  const filteredProperties = selectedBlockFilter
    ? properties.filter(p => p.block_id === selectedBlockFilter)
    : properties

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Unidades del Condominio</h2>
          <p className="text-sm text-gray-600 mt-1">Lista de todas las unidades (propiedades) del condominio</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Blocks management button */}
          <button
            onClick={() => setShowBlocksForm(!showBlocksForm)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Bloques
          </button>
          {/* View mode toggle */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-l-md`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-r-md`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Unidad
          </button>
        </div>
      </div>

      {/* Blocks management form */}
      {showBlocksForm && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingBlockId ? 'Editar Bloque' : 'Gestionar Bloques'}
            </h3>
            <button
              onClick={() => {
                setShowBlocksForm(false)
                cancelEditBlock()
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={editingBlockId ? handleUpdateBlock : handleCreateBlock} className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Bloque *
                </label>
                <input
                  type="text"
                  required
                  value={blockFormData.name}
                  onChange={(e) => setBlockFormData({ ...blockFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Bloque A, Manzana 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={blockFormData.description}
                  onChange={(e) => setBlockFormData({ ...blockFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descripción opcional"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creatingBlock}
                  className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {creatingBlock ? 'Guardando...' : editingBlockId ? 'Actualizar' : 'Crear Bloque'}
                </button>
                {editingBlockId && (
                  <button
                    type="button"
                    onClick={cancelEditBlock}
                    className="ml-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Bloques existentes</h4>
            {blocks.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay bloques registrados</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{block.name}</p>
                      {block.description && (
                        <p className="text-xs text-gray-500 mt-1">{block.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => handleEditBlock(block)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingBlockId(block.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {deletingBlockId && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar eliminación</h3>
                <p className="text-sm text-gray-500 mb-6">
                  ¿Estás seguro de que deseas eliminar este bloque? Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeletingBlockId(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(deletingBlockId)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter by block (only in list view) */}
      {viewMode === 'list' && blocks.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Bloque
          </label>
          <select
            value={selectedBlockFilter || ''}
            onChange={(e) => setSelectedBlockFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los bloques</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay unidades</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedBlockFilter ? 'No hay unidades en el bloque seleccionado.' : 'Comienza agregando una nueva unidad al condominio.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {property.photo_url && (
                <img
                  src={`http://localhost:8000${property.photo_url}`}
                  alt={property.code}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{property.code}</h3>
                  {property.block && (
                    <p className="text-sm text-gray-600 mt-1">Bloque: {property.block.name}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{getPropertyTypeLabel(property.type)}</p>
                  {property.property_residents?.find(pr => pr.ownership_percentage === 100.0)?.resident && (
                    <p className="text-sm text-gray-700 mt-1 font-medium">
                      Titular: {property.property_residents.find(pr => pr.ownership_percentage === 100.0)?.resident?.full_name}
                    </p>
                  )}
                  {property.area && (
                    <p className="text-sm text-gray-500 mt-1">{property.area} m²</p>
                  )}
                  {property.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{property.description}</p>
                  )}
                </div>
                <button 
                  onClick={() => handleEditProperty(property)}
                  className="text-indigo-600 hover:text-indigo-900"
                  title="Editar unidad"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bloque</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titular</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {property.photo_url && (
                        <img
                          src={`http://localhost:8000${property.photo_url}`}
                          alt={property.code}
                          className="h-10 w-10 rounded-lg object-cover mr-3"
                        />
                      )}
                      <div className="text-sm font-medium text-gray-900">{property.code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{property.block?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {getPropertyTypeLabel(property.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {property.property_residents?.find(pr => pr.ownership_percentage === 100.0)?.resident?.full_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {property.area ? `${property.area} m²` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">{property.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de creación */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Nueva Unidad</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Número de unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Unidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 101, A-5, Local 10"
                  />
                </div>

                {/* Bloque o Manzana */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bloque o Manzana
                  </label>
                  <select
                    value={formData.block_id}
                    onChange={(e) => setFormData({ ...formData, block_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin bloque</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="apartment">Apartamento</option>
                    <option value="house">Casa</option>
                    <option value="commercial">Local Comercial</option>
                    <option value="parking">Parqueadero</option>
                    <option value="storage">Bodega</option>
                  </select>
                </div>

                {/* Área */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 75.5"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descripción adicional de la unidad..."
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formData.photo && (
                  <p className="mt-1 text-sm text-gray-500">{formData.photo.name}</p>
                )}
              </div>

              {/* Subformulario de Residentes */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Residentes que Habitan
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResidentForm(!showResidentForm)}
                    className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Registrar Residente
                  </button>
                </div>

                {/* Formulario de creación de residente */}
                {showResidentForm && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Nuevo Residente</h4>
                    <form onSubmit={handleCreateResident} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nombre Completo *
                          </label>
                          <input
                            type="text"
                            required
                            value={residentFormData.full_name}
                            onChange={(e) => setResidentFormData({ ...residentFormData, full_name: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={residentFormData.email}
                            onChange={(e) => setResidentFormData({ ...residentFormData, email: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={residentFormData.phone}
                            onChange={(e) => setResidentFormData({ ...residentFormData, phone: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="+57 300 123 4567"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Tipo de Documento
                          </label>
                          <select
                            value={residentFormData.document_type}
                            onChange={(e) => setResidentFormData({ ...residentFormData, document_type: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Seleccionar</option>
                            <option value="CC">Cédula de Ciudadanía</option>
                            <option value="CE">Cédula de Extranjería</option>
                            <option value="NIT">NIT</option>
                            <option value="Pasaporte">Pasaporte</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Número de Documento
                          </label>
                          <input
                            type="text"
                            value={residentFormData.document_number}
                            onChange={(e) => setResidentFormData({ ...residentFormData, document_number: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="1234567890"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Foto
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setResidentFormData({ ...residentFormData, photo: e.target.files?.[0] || null })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowResidentForm(false)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          disabled={creatingResident}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={creatingResident}
                          className="px-3 py-1.5 text-sm border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {creatingResident ? 'Guardando...' : 'Guardar Residente'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {residents.length === 0 && !showResidentForm ? (
                  <p className="text-sm text-gray-500 italic">No hay residentes disponibles. Haz clic en "Registrar Residente" para crear uno.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {residents.map((resident) => {
                      const isSelected = formData.selectedResidents.some(r => r.resident_id === resident.id)
                      const assignment = formData.selectedResidents.find(r => r.resident_id === resident.id)
                      return (
                        <div
                          key={resident.id}
                          className={`p-3 border rounded-md ${
                            isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleResidentToggle(resident.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{resident.full_name}</p>
                                {resident.email && (
                                  <p className="text-sm text-gray-500">{resident.email}</p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignment?.is_owner || false}
                                  onChange={() => handleOwnerToggle(resident.id)}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Titular</span>
                              </label>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editingPropertyId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Editar Unidad</h3>
              <button
                onClick={cancelEditProperty}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Número de unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Unidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 101, A-5, Local 10"
                  />
                </div>

                {/* Bloque o Manzana */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bloque o Manzana
                  </label>
                  <select
                    value={editFormData.block_id}
                    onChange={(e) => setEditFormData({ ...editFormData, block_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin bloque</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="apartment">Apartamento</option>
                    <option value="house">Casa</option>
                    <option value="commercial">Local Comercial</option>
                    <option value="parking">Parqueadero</option>
                    <option value="storage">Bodega</option>
                  </select>
                </div>

                {/* Área */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.area}
                    onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 75.5"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descripción adicional de la unidad..."
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto (dejar vacío para mantener la actual)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditFormData({ ...editFormData, photo: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {editFormData.photo && (
                  <p className="mt-1 text-sm text-gray-500">{editFormData.photo.name}</p>
                )}
              </div>

              {/* Residentes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Residentes que Habitan
                </label>
                {residents.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay residentes disponibles.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {residents.map((resident) => {
                      const isSelected = editSelectedResidents.some(r => r.resident_id === resident.id)
                      const assignment = editSelectedResidents.find(r => r.resident_id === resident.id)
                      return (
                        <div
                          key={resident.id}
                          className={`p-3 border rounded-md ${
                            isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setEditSelectedResidents(editSelectedResidents.filter(r => r.resident_id !== resident.id))
                                  } else {
                                    setEditSelectedResidents([...editSelectedResidents, {
                                      resident_id: resident.id,
                                      is_owner: false,
                                      ownership_percentage: 0
                                    }])
                                  }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{resident.full_name}</p>
                                {resident.email && (
                                  <p className="text-sm text-gray-500">{resident.email}</p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignment?.is_owner || false}
                                  onChange={() => {
                                    setEditSelectedResidents(editSelectedResidents.map(r => {
                                      if (r.resident_id === resident.id) {
                                        return { ...r, is_owner: !r.is_owner, ownership_percentage: !r.is_owner ? 100 : 0 }
                                      }
                                      // Si se marca como titular, desmarcar los demás
                                      if (!r.is_owner && r.resident_id !== resident.id) {
                                        return r
                                      }
                                      return r.is_owner ? { ...r, is_owner: false, ownership_percentage: 0 } : r
                                    }))
                                  }}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Titular</span>
                              </label>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={cancelEditProperty}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={updating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {updating ? 'Actualizando...' : 'Actualizar Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

