import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import PropertiesList from '../components/condominium/PropertiesList'
import ResidentsList from '../components/condominium/ResidentsList'
import PropertyAccounting from '../components/condominium/PropertyAccounting'
import AdministrationInvoices from '../components/condominium/AdministrationInvoices'
import AssemblyManagement from '../components/condominium/AssemblyManagement'
import CondominiumSettings from '../components/condominium/CondominiumSettings'
import type { AdministrationValueType } from '../components/condominium/CondominiumSettings'

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
  administration_value_type?: AdministrationValueType | null
  administration_value_cop?: number | null
  created_at: string
  updated_at: string | null
}

type ModuleTab = 'properties' | 'residents' | 'accounting' | 'invoices' | 'assembly' | 'settings'

export default function CondominiumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isSuperAdmin, isTitularOrResident, getPropertyIdsForCondominium } = useAuthStore()
  const [condominium, setCondominium] = useState<Condominium | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<ModuleTab>('properties')

  const condoId = condominium?.id ?? 0
  const propertyIds = condoId ? getPropertyIdsForCondominium(condoId) : null
  const isTitularResident = isTitularOrResident()
  const hasUnit = isTitularResident && propertyIds !== null && propertyIds.length > 0
  const noUnit = isTitularResident && propertyIds !== null && propertyIds.length === 0

  const showPropertiesTab = !isTitularResident || hasUnit
  const showResidentsTab = !isTitularResident || hasUnit
  const showAccountingTab = true
  const showInvoicesTab = !isTitularResident || hasUnit
  const showAssemblyTab = true
  const showSettingsTab = !isTitularResident || isSuperAdmin()

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

  // Si titular/residente sin unidad y está en tab no permitida, pasar a contabilidad
  useEffect(() => {
    if (!condominium) return
    const ids = getPropertyIdsForCondominium(condominium.id)
    const sinUnidad = isTitularOrResident() && ids !== null && ids.length === 0
    if (sinUnidad && ['properties', 'residents', 'invoices'].includes(activeTab)) {
      setActiveTab('accounting')
    }
  }, [condominium?.id, activeTab])

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-200">Cargando condominio...</p>
        </div>
      </div>
    )
  }

  if (error && !condominium) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-200 mb-6">{error}</p>
          <button
            onClick={handleBackToCondominiums}
            className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-2 rounded-lg"
            title="Volver a Condominios"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (!condominium) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                    className="h-16 w-16 rounded-lg object-cover"
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
              <div className="flex items-center gap-3">
                {/* User Profile Component */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 bg-transparent hover:bg-white/10 text-white font-medium py-2 px-3 rounded-lg transition-colors"
                  title="Mi Perfil"
                >
                  {user?.photo_url ? (
                    <img
                      src={`http://localhost:8000${user.photo_url}`}
                      alt={user.full_name || user.email}
                      className="h-8 w-8 rounded-full object-cover border-2 border-white/50"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50">
                      <span className="text-white font-semibold text-xs">
                        {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-medium text-white">
                      {user?.full_name || 'Usuario'}
                    </div>
                    <div className="text-xs text-white/80">
                      {user?.email}
                    </div>
                  </div>
                </Link>
                
                {/* Settings Button (only for super admin) */}
                {isSuperAdmin() && (
                  <Link
                    to="/settings"
                    className="flex items-center justify-center bg-transparent hover:bg-white/10 text-white font-medium py-2 px-2 rounded-lg transition-colors"
                    title="Configuración"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                )}
                
                <button
                  onClick={handleBackToCondominiums}
                  className="flex items-center justify-center bg-white/90 hover:bg-white text-gray-900 font-medium py-2 px-2 rounded-lg transition-colors shadow-lg"
                  title="Volver a Condominios"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header without Landscape Image */}
      {!condominium.landscape_image_url && (
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {condominium.short_name || condominium.name}
                  </h1>
                  {condominium.short_name && condominium.name !== condominium.short_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-200">{condominium.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* User Profile Component */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-100 font-medium py-2 px-3 rounded-lg transition-colors"
                  title="Mi Perfil"
                >
                  {user?.photo_url ? (
                    <img
                      src={`http://localhost:8000${user.photo_url}`}
                      alt={user.full_name || user.email}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-100 font-semibold text-xs">
                        {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {user?.full_name || 'Usuario'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-200">
                      {user?.email}
                    </div>
                  </div>
                </Link>
                
                {/* Settings Button (only for super admin) */}
                {isSuperAdmin() && (
                  <Link
                    to="/settings"
                    className="flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-100 font-medium py-2 px-2 rounded-lg transition-colors"
                    title="Configuración"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                )}
                
                <button
                  onClick={handleBackToCondominiums}
                  className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2 px-2 rounded-lg transition-colors"
                  title="Volver a Condominios"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px flex-wrap" aria-label="Tabs">
              {showPropertiesTab && (
              <button
                onClick={() => setActiveTab('properties')}
                className={`${
                  activeTab === 'properties'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Unidades</span>
                </div>
              </button>
              )}
              {showResidentsTab && (
              <button
                onClick={() => setActiveTab('residents')}
                className={`${
                  activeTab === 'residents'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Residentes</span>
                </div>
              </button>
              )}
              {showAccountingTab && (
              <button
                onClick={() => setActiveTab('accounting')}
                className={`${
                  activeTab === 'accounting'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Contabilidad</span>
                </div>
              </button>
              )}
              {showInvoicesTab && (
              <button
                onClick={() => setActiveTab('invoices')}
                className={`${
                  activeTab === 'invoices'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Facturación</span>
                </div>
              </button>
              )}
              {showAssemblyTab && (
              <button
                onClick={() => setActiveTab('assembly')}
                className={`${
                  activeTab === 'assembly'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Asamblea</span>
                </div>
              </button>
              )}
              {showSettingsTab && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Ajustes de condominio</span>
                </div>
              </button>
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {activeTab === 'properties' && (
            <PropertiesList
              condominiumId={condominium.id}
              restrictToPropertyIds={hasUnit ? (propertyIds ?? undefined) : (noUnit ? [] : undefined)}
            />
          )}
          {activeTab === 'residents' && (
            <ResidentsList
              condominiumId={condominium.id}
              restrictToPropertyIds={hasUnit ? (propertyIds ?? undefined) : (noUnit ? [] : undefined)}
            />
          )}
          {activeTab === 'accounting' && (
            <PropertyAccounting
              condominiumId={condominium.id}
              restrictToPropertyIds={noUnit ? [] : (hasUnit ? (propertyIds ?? undefined) : undefined)}
            />
          )}
          {activeTab === 'invoices' && (
            <AdministrationInvoices
              condominiumId={condominium.id}
              restrictToPropertyIds={hasUnit ? (propertyIds ?? undefined) : (noUnit ? [] : undefined)}
            />
          )}
          {activeTab === 'assembly' && (
            <AssemblyManagement
              condominiumId={condominium.id}
              canParticipate={!noUnit}
            />
          )}
          {activeTab === 'settings' && (
            <CondominiumSettings
              condominiumId={condominium.id}
              administrationValueType={(condominium.administration_value_type as AdministrationValueType) || null}
              administrationValueCop={condominium.administration_value_cop ?? null}
              onUpdate={(data) =>
                setCondominium((prev) =>
                  prev
                    ? {
                        ...prev,
                        administration_value_type: data.administration_value_type,
                        administration_value_cop: data.administration_value_cop,
                      }
                    : null
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
