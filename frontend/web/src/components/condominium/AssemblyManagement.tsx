import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

interface Assembly {
  id: number
  condominium_id: number
  assembly_number: number | null
  title: string
  scheduled_date: string
  started_at: string | null  // Hora de inicio real
  location: string | null
  agenda: string | null
  minutes: string | null  // Acta de la reuni?n
  required_quorum: number
  current_quorum: number
  status: string
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string | null
}

interface VoteOption {
  label: string
  color: string
  key: string
}

interface AssemblyVote {
  id: number
  assembly_id: number
  topic: string
  description: string | null
  vote_type: string
  options: string | null  // JSON string con array de VoteOption
  option_votes: string | null  // JSON string con conteo por opci?n
  total_votes: number
  yes_votes: number
  no_votes: number
  abstain_votes: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

interface AssemblyAttendance {
  id: number
  assembly_id: number
  resident_id: number
  attended: boolean
  attendance_confirmed_at: string | null
  created_at: string
}

interface Resident {
  id: number
  full_name: string
  email: string | null
}

interface AssemblyManagementProps {
  condominiumId: number
  /** Si false, titular/residente sin unidad: solo ver, no votar ni registrar asistencia. */
  canParticipate?: boolean
}

export default function AssemblyManagement({ condominiumId, canParticipate = true }: AssemblyManagementProps) {
  const { isAdmin, isSuperAdmin } = useAuthStore()
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null)
  const [votes, setVotes] = useState<AssemblyVote[]>([])
  const [attendance, setAttendance] = useState<AssemblyAttendance[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showVoteForm, setShowVoteForm] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const [minutesText, setMinutesText] = useState('')
  const [savingMinutes, setSavingMinutes] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    scheduled_date: '',
    location: '',
    agenda: '',
    required_quorum: 50.0
  })
  const [voteFormData, setVoteFormData] = useState({
    topic: '',
    description: '',
    vote_type: 'custom',
    options: [] as VoteOption[]
  })

  useEffect(() => {
    loadAssemblies()
    loadResidents()
  }, [condominiumId])

  useEffect(() => {
    if (selectedAssembly) {
      loadAssemblyDetails(selectedAssembly.id)
    }
  }, [selectedAssembly])

  const loadAssemblies = async () => {
    try {
      const response = await api.get(`/assemblies/condominium/${condominiumId}`)
      setAssemblies(response.data)
    } catch (error: any) {
      console.error('Error loading assemblies:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadResidents = async () => {
    try {
      const response = await api.get(`/residents/condominium/${condominiumId}`)
      setResidents(response.data)
    } catch (error: any) {
      console.error('Error loading residents:', error)
    }
  }

  const loadAssemblyDetails = async (assemblyId: number) => {
    try {
      const [assemblyResponse, votesResponse, attendanceResponse] = await Promise.all([
        api.get(`/assemblies/${assemblyId}`),
        api.get(`/assemblies/${assemblyId}/votes`),
        api.get(`/assemblies/${assemblyId}/attendance`)
      ])
      setSelectedAssembly(assemblyResponse.data)
      setMinutesText(assemblyResponse.data.minutes || '')
      setVotes(votesResponse.data)
      setAttendance(attendanceResponse.data)
    } catch (error: any) {
      console.error('Error loading assembly details:', error)
    }
  }

  const handleCreateAssembly = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/assemblies/', {
        ...formData,
        condominium_id: condominiumId
      })
      setShowCreateForm(false)
      setFormData({
        title: '',
        scheduled_date: '',
        location: '',
        agenda: '',
        required_quorum: 50.0
      })
      loadAssemblies()
    } catch (error: any) {
      console.error('Error creating assembly:', error)
      alert('Error al crear la asamblea: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCreateVote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssembly) return
    
    if (voteFormData.options.length === 0) {
      alert('Debe agregar al menos una opci?n de votaci?n')
      return
    }
    
    try {
      await api.post(`/assemblies/${selectedAssembly.id}/votes`, {
        topic: voteFormData.topic,
        description: voteFormData.description,
        vote_type: 'custom',
        options: JSON.stringify(voteFormData.options),
        assembly_id: selectedAssembly.id
      })
      setShowVoteForm(false)
      setVoteFormData({
        topic: '',
        description: '',
        vote_type: 'custom',
        options: []
      })
      loadAssemblyDetails(selectedAssembly.id)
    } catch (error: any) {
      console.error('Error creating vote:', error)
      alert('Error al crear la votaci?n: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSaveMinutes = async () => {
    if (!selectedAssembly) return
    setSavingMinutes(true)
    try {
      await api.put(`/assemblies/${selectedAssembly.id}/minutes`, minutesText, {
        headers: { 'Content-Type': 'text/plain' }
      })
      await loadAssemblyDetails(selectedAssembly.id)
      alert('Acta guardada exitosamente')
    } catch (error: any) {
      console.error('Error saving minutes:', error)
      alert('Error al guardar el acta: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSavingMinutes(false)
    }
  }

  const addVoteOption = () => {
    const newOption: VoteOption = {
      label: '',
      color: '#3B82F6',
      key: `option_${Date.now()}`
    }
    setVoteFormData({
      ...voteFormData,
      options: [...voteFormData.options, newOption]
    })
  }

  const removeVoteOption = (index: number) => {
    setVoteFormData({
      ...voteFormData,
      options: voteFormData.options.filter((_, i) => i !== index)
    })
  }

  const updateVoteOption = (index: number, field: keyof VoteOption, value: string) => {
    const newOptions = [...voteFormData.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setVoteFormData({ ...voteFormData, options: newOptions })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleUpdateStatus = async (assemblyId: number, newStatus: string) => {
    try {
      await api.put(`/assemblies/${assemblyId}`, { status: newStatus })
      loadAssemblies()
      if (selectedAssembly?.id === assemblyId) {
        loadAssemblyDetails(assemblyId)
      }
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert('Error al actualizar el estado: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteAssembly = async (assemblyId: number, assemblyTitle: string) => {
    // Confirmaci?n de seguridad - Primera verificaci?n
    const confirmMessage = `?Est? seguro que desea ELIMINAR la asamblea "${assemblyTitle}"?\n\n` +
      `Esta acci?n es IRREVERSIBLE y eliminar?:\n` +
      `- La asamblea y toda su informaci?n\n` +
      `- Todas las votaciones asociadas\n` +
      `- Todos los registros de asistencia\n` +
      `- El acta de la reuni?n\n\n` +
      `Escriba "ELIMINAR" para confirmar:`
    
    const userInput = prompt(confirmMessage)
    
    if (userInput !== 'ELIMINAR') {
      if (userInput !== null) {
        alert('La eliminaci?n fue cancelada. Debe escribir exactamente "ELIMINAR" para confirmar.')
      }
      return
    }
    
    // Segunda confirmaci?n
    const secondConfirm = window.confirm(
      `?? ADVERTENCIA FINAL ??\n\n` +
      `Est? a punto de eliminar permanentemente la asamblea "${assemblyTitle}".\n\n` +
      `?Est? completamente seguro de realizar esta acci?n?`
    )
    
    if (!secondConfirm) {
      return
    }
    
    try {
      await api.delete(`/assemblies/${assemblyId}`)
      alert('Asamblea eliminada exitosamente')
      loadAssemblies()
      if (selectedAssembly?.id === assemblyId) {
        setSelectedAssembly(null)
      }
    } catch (error: any) {
      console.error('Error deleting assembly:', error)
      alert('Error al eliminar la asamblea: ' + (error.response?.data?.detail || error.message))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada'
      case 'in_progress':
        return 'En Curso'
      case 'completed':
        return 'Finalizada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Cargando asambleas...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gesti?n de Asambleas</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nueva Asamblea
        </button>
      </div>

      {/* Create Assembly Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Crear Nueva Asamblea</h3>
            <form onSubmit={handleCreateAssembly}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    T?tulo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Fecha y Hora
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Ubicaci?n
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Orden del D?a
                  </label>
                  <textarea
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ingrese el orden del d?a de la asamblea..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Quorum Requerido (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.required_quorum}
                    onChange={(e) => setFormData({ ...formData, required_quorum: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Crear Asamblea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assemblies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {assemblies.map((assembly) => (
          <div
            key={assembly.id}
            onClick={() => setSelectedAssembly(assembly)}
            className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-4 cursor-pointer transition-all border-gray-200 dark:border-gray-600 ${
              selectedAssembly?.id === assembly.id
                ? 'border-indigo-500 shadow-lg'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                {assembly.assembly_number && (
                  <span className="text-xs text-gray-500 font-medium">Asamblea #{assembly.assembly_number}</span>
                )}
                <h3 className="font-semibold text-lg text-gray-900">{assembly.title}</h3>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(assembly.status)}`}>
                {getStatusText(assembly.status)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Fecha Programada:</strong> {formatDate(assembly.scheduled_date)}
            </p>
            {assembly.started_at && (
              <p className="text-sm text-gray-600 mb-2">
                <strong>Iniciada:</strong> {formatDate(assembly.started_at)}
              </p>
            )}
            {assembly.location && (
              <p className="text-sm text-gray-600 mb-2">
                <strong>Ubicaci?n:</strong> {assembly.location}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quorum:</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-semibold ${
                    assembly.current_quorum >= assembly.required_quorum
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {assembly.current_quorum.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500">
                    / {assembly.required_quorum}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    assembly.current_quorum >= assembly.required_quorum
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(assembly.current_quorum, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assembly Details */}
      {selectedAssembly && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {!canParticipate && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
              Solo consulta. No puede participar en votaciones ni registrar asistencia porque no tiene unidad asociada.
            </div>
          )}
          <div className="flex justify-between items-start mb-6">
            <div>
              {selectedAssembly.assembly_number && (
                <p className="text-sm text-gray-500 dark:text-gray-200 font-medium mb-1">Asamblea #{selectedAssembly.assembly_number}</p>
              )}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{selectedAssembly.title}</h3>
              <p className="text-gray-600 dark:text-gray-200">
                <strong>Fecha Programada:</strong> {formatDate(selectedAssembly.scheduled_date)}
              </p>
              {selectedAssembly.started_at && (
                <p className="text-gray-600 dark:text-gray-200">
                  <strong>Iniciada:</strong> {formatDate(selectedAssembly.started_at)}
                </p>
              )}
              {selectedAssembly.location && (
                <p className="text-gray-600 dark:text-gray-200">
                  <strong>Ubicaci?n:</strong> {selectedAssembly.location}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              {selectedAssembly.status === 'completed' && (
                <button
                  onClick={() => setShowPrintView(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  ?? Imprimir Acta
                </button>
              )}
              {isAdmin() && selectedAssembly.status === 'scheduled' && (
                <button
                  onClick={() => handleUpdateStatus(selectedAssembly.id, 'in_progress')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Iniciar Asamblea
                </button>
              )}
              {isAdmin() && selectedAssembly.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus(selectedAssembly.id, 'completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Finalizar Asamblea
                </button>
              )}
              {isSuperAdmin() && (
                <button
                  onClick={() => handleDeleteAssembly(selectedAssembly.id, selectedAssembly.title)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  title="Eliminar asamblea (solo superadministrador)"
                >
                  ??? Eliminar
                </button>
              )}
              <button
                onClick={() => setSelectedAssembly(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Quorum Display */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Quorum de la Asamblea</h4>
              <span className={`text-lg font-bold ${
                selectedAssembly.current_quorum >= selectedAssembly.required_quorum
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {selectedAssembly.current_quorum.toFixed(1)}% / {selectedAssembly.required_quorum}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  selectedAssembly.current_quorum >= selectedAssembly.required_quorum
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(selectedAssembly.current_quorum, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {selectedAssembly.current_quorum >= selectedAssembly.required_quorum
                ? '? Quorum alcanzado'
                : '?? Quorum no alcanzado'}
            </p>
          </div>

          {/* Agenda */}
          {selectedAssembly.agenda && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Orden del D?a</h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                {selectedAssembly.agenda}
              </div>
            </div>
          )}

          {/* Minutes Editor (Only for admins, only when not completed) */}
          {isAdmin() && selectedAssembly.status !== 'completed' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Acta de la Reuni?n</h4>
                <button
                  onClick={handleSaveMinutes}
                  disabled={savingMinutes}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingMinutes ? 'Guardando...' : '?? Guardar Acta'}
                </button>
              </div>
              <textarea
                value={minutesText}
                onChange={(e) => setMinutesText(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder="Escriba aqu? el acta de la reuni?n..."
              />
            </div>
          )}

          {/* Minutes Display (Read-only when completed or for non-admins) */}
          {selectedAssembly.minutes && (selectedAssembly.status === 'completed' || !isAdmin()) && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Acta de la Reuni?n</h4>
              {selectedAssembly.status === 'completed' && (
                <p className="text-sm text-gray-500 dark:text-gray-200 mb-2 italic">
                  La asamblea est? finalizada. El acta no puede ser editada.
                </p>
              )}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                {selectedAssembly.minutes}
              </div>
            </div>
          )}


          {/* Votes Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Votaciones</h4>
              {isAdmin() && selectedAssembly.status === 'in_progress' && (
                <button
                  onClick={() => setShowVoteForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  + Nueva Votación
                </button>
              )}
            </div>

            {showVoteForm && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Crear Nueva Votaci?n</h5>
                <form onSubmit={handleCreateVote}>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                        Tema/Pregunta
                      </label>
                      <input
                        type="text"
                        required
                        value={voteFormData.topic}
                        onChange={(e) => setVoteFormData({ ...voteFormData, topic: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                        Descripci?n
                      </label>
                      <textarea
                        value={voteFormData.description}
                        onChange={(e) => setVoteFormData({ ...voteFormData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Opciones de Votaci?n
                        </label>
                        <button
                          type="button"
                          onClick={addVoteOption}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          + Agregar Opci?n
                        </button>
                      </div>
                      <div className="space-y-2">
                        {voteFormData.options.map((option, index) => (
                          <div key={option.key} className="flex items-center space-x-2">
                            <input
                              type="text"
                              required
                              value={option.label}
                              onChange={(e) => updateVoteOption(index, 'label', e.target.value)}
                              placeholder="Nombre de la opci?n"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="color"
                              value={option.color}
                              onChange={(e) => updateVoteOption(index, 'color', e.target.value)}
                              className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => removeVoteOption(index)}
                              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                              ?
                            </button>
                          </div>
                        ))}
                        {voteFormData.options.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            Agregue al menos una opci?n de votaci?n
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowVoteForm(false)
                          setVoteFormData({
                            topic: '',
                            description: '',
                            vote_type: 'custom',
                            options: []
                          })
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Crear
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {votes.map((vote) => {
                let voteOptions: VoteOption[] = []
                let optionVotes: Record<string, number> = {}
                try {
                  if (vote.options) {
                    voteOptions = JSON.parse(vote.options)
                  }
                  if (vote.option_votes) {
                    optionVotes = JSON.parse(vote.option_votes)
                  }
                } catch (e) {
                  console.error('Error parsing vote options:', e)
                }

                return (
                  <div key={vote.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100">{vote.topic}</h5>
                        {vote.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">{vote.description}</p>
                        )}
                      </div>
                      {vote.is_active && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                          Activa
                        </span>
                      )}
                    </div>
                    {voteOptions.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {voteOptions.map((option) => (
                          <div key={option.key} className="text-center">
                            <div
                              className="text-2xl font-bold rounded-lg p-3 text-white"
                              style={{ backgroundColor: option.color }}
                            >
                              {optionVotes[option.key] || 0}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-200 mt-1">{option.label}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{vote.yes_votes}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-200">S?</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{vote.no_votes}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-200">No</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">{vote.abstain_votes}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-200">Abstenci?n</div>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-600 dark:text-gray-200">
                        Total de votos: <strong>{vote.total_votes}</strong>
                      </div>
                    </div>
                  </div>
                )
              })}
              {votes.length === 0 && (
                <p className="text-gray-500 dark:text-gray-200 text-center py-4">No hay votaciones registradas</p>
              )}
            </div>
          </div>

          {/* Attendance Section */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Asistencia</h4>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {attendance.map((att) => {
                  const resident = residents.find(r => r.id === att.resident_id)
                  return (
                    <div key={att.id} className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        att.attended ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm text-gray-700 dark:text-gray-100">
                        {resident?.full_name || `Residente #${att.resident_id}`}
                      </span>
                    </div>
                  )
                })}
              </div>
              {attendance.length === 0 && (
                <p className="text-gray-500 dark:text-gray-200 text-center py-4">No hay asistencias registradas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {assemblies.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-200 mb-4">No hay asambleas registradas</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Crear Primera Asamblea
          </button>
        </div>
      )}

      {/* Print View */}
      {showPrintView && selectedAssembly && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 p-8 overflow-y-auto print:p-0">
          <div className="max-w-4xl mx-auto print:max-w-full">
            <div className="mb-6 print:hidden">
              <button
                onClick={() => setShowPrintView(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-2"
              >
                ? Volver
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ??? Imprimir
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 print:p-0 border border-gray-200 dark:border-gray-700">
              {selectedAssembly.assembly_number && (
                <p className="text-center text-sm text-gray-500 mb-2">Asamblea #{selectedAssembly.assembly_number}</p>
              )}
              <h1 className="text-3xl font-bold text-center mb-2">{selectedAssembly.title}</h1>
              <p className="text-center text-gray-600 mb-2">
                <strong>Fecha Programada:</strong> {formatDate(selectedAssembly.scheduled_date)}
              </p>
              {selectedAssembly.started_at && (
                <p className="text-center text-gray-600 mb-2">
                  <strong>Iniciada:</strong> {formatDate(selectedAssembly.started_at)}
                </p>
              )}
              {selectedAssembly.location && (
                <p className="text-center text-gray-600 mb-8">
                  <strong>Ubicaci?n:</strong> {selectedAssembly.location}
                </p>
              )}

              {selectedAssembly.agenda && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-2">Orden del D?a</h2>
                  <div className="whitespace-pre-wrap border-l-4 border-indigo-500 pl-4">
                    {selectedAssembly.agenda}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Quorum</h2>
                <p className="text-lg">
                  <strong>Quorum alcanzado:</strong> {selectedAssembly.current_quorum.toFixed(1)}% 
                  (Requerido: {selectedAssembly.required_quorum}%)
                  {selectedAssembly.current_quorum >= selectedAssembly.required_quorum ? ' ?' : ' ??'}
                </p>
              </div>

              {votes.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Votaciones Realizadas</h2>
                  {votes.map((vote) => {
                    let voteOptions: VoteOption[] = []
                    let optionVotes: Record<string, number> = {}
                    try {
                      if (vote.options) {
                        voteOptions = JSON.parse(vote.options)
                      }
                      if (vote.option_votes) {
                        optionVotes = JSON.parse(vote.option_votes)
                      }
                    } catch (e) {
                      console.error('Error parsing vote options:', e)
                    }

                    return (
                      <div key={vote.id} className="mb-4 border-b pb-4">
                        <h3 className="font-semibold text-lg mb-1">{vote.topic}</h3>
                        {vote.description && (
                          <p className="text-gray-600 mb-3">{vote.description}</p>
                        )}
                        {voteOptions.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {voteOptions.map((option) => (
                              <div key={option.key} className="flex items-center space-x-2">
                                <div
                                  className="w-6 h-6 rounded"
                                  style={{ backgroundColor: option.color }}
                                />
                                <span className="font-medium">{option.label}:</span>
                                <span className="text-lg font-bold">{optionVotes[option.key] || 0}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3">
                            <div>S?: {vote.yes_votes}</div>
                            <div>No: {vote.no_votes}</div>
                            <div>Abstenci?n: {vote.abstain_votes}</div>
                          </div>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          Total de votos: {vote.total_votes}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {attendance.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Asistencia</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {attendance
                      .filter(att => att.attended)
                      .map((att) => {
                        const resident = residents.find(r => r.id === att.resident_id)
                        return (
                          <div key={att.id} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>{resident?.full_name || `Residente #${att.resident_id}`}</span>
                          </div>
                        )
                      })}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Total de asistentes: {attendance.filter(att => att.attended).length}
                  </p>
                </div>
              )}

              {selectedAssembly.minutes && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">Acta de la Reuni?n</h2>
                  <div className="whitespace-pre-wrap border-l-4 border-indigo-500 pl-4">
                    {selectedAssembly.minutes}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
                <p>Documento generado el {new Date().toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
