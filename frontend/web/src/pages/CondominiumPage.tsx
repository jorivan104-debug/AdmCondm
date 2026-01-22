import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import PropertiesList from '../components/condominium/PropertiesList'
import ResidentsList from '../components/condominium/ResidentsList'
import PropertyAccounting from '../components/condominium/PropertyAccounting'

interface Condominium {
  id: number
  name: string
  short_name: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  email: string | null
  nit: string | null
  administrator_name: string | null
  administrator_phone: string | null
  administrator_email: string | null
  logo_url: string | null
  landscape_image_url: string | null
  description: string | null
  total_units: number | null
  created_at: string
  updated_at: string | null
}

type ModuleTab = 'properties' | 'residents' | 'accounting'

export default function CondominiumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [condominium, setCondominium] = useState<Condominium | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<ModuleTab>('properties')

  useEffect(() => {
    if (id) {
      loadCondominium(parseInt(id))
    } else {
      const savedId = localStorage.getItem('selectedCondominiumId')
      if (savedId) {
        loadCondominium(parseInt(savedId))
      } else {
        setError('No se ha seleccionado un condominio')
        setLoading(false)
      }
    }
  }, [id])

  const loadCondominium = async (condominiumId: number) => {
    try {
      const response = await api.get(`/condominiums/${condominiumId}`)
      setCondominium(response.data)
      localStorage.setItem('selectedCondominiumId', condominiumId.toString())
    } catch (err: any) {
      console.error('Error loading condominium:', err)
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setError('Error al cargar el condominio')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBackToCondominiums = () => {
    localStorage.removeItem('selectedCondominiumId')
    navigate('/condominiums')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando condominio...</p>
        </div>
      </div>
    )
  }

  if (error && !condominium) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBackToCondominiums}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Volver a Condominios
          </button>
        </div>
      </div>
    )
  }

  if (!condominium) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Landscape Image */}
      {condominium.landscape_image_url && (
        <div className="relative h-64 w-full overflow-hidden">
          <img
            src={`http://localhost:8000${condominium.landscape_image_url}`}
            alt={condominium.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {condominium.logo_url && (
                  <img
                    src={`http://localhost:8000${condominium.logo_url}`}
                    alt={condominium.name}
                    className="h-16 w-16 rounded-lg object-cover border-2 border-white shadow-lg"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {condominium.short_name || condominium.name}
                  </h1>
                  {condominium.short_name && condominium.name !== condominium.short_name && (
                    <p className="text-sm text-white/90">{condominium.name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleBackToCondominiums}
                className="flex items-center space-x-2 bg-white/90 hover:bg-white text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors shadow-lg"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver a Condominios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header without Landscape Image */}
      {!condominium.landscape_image_url && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {condominium.logo_url && (
                  <img
                    src={`http://localhost:8000${condominium.logo_url}`}
                    alt={condominium.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {condominium.short_name || condominium.name}
                  </h1>
                  {condominium.short_name && condominium.name !== condominium.short_name && (
                    <p className="text-sm text-gray-500">{condominium.name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleBackToCondominiums}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver a Condominios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('properties')}
                className={`${
                  activeTab === 'properties'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Unidades</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('residents')}
                className={`${
                  activeTab === 'residents'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Residentes</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('accounting')}
                className={`${
                  activeTab === 'accounting'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Contabilidad</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg">
          {activeTab === 'properties' && <PropertiesList condominiumId={condominium.id} />}
          {activeTab === 'residents' && <ResidentsList condominiumId={condominium.id} />}
          {activeTab === 'accounting' && <PropertyAccounting condominiumId={condominium.id} />}
        </div>
      </div>
    </div>
  )
}
