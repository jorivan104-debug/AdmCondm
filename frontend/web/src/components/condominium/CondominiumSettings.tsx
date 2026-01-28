import { useState, useEffect } from 'react'
import api from '../../services/api'

export type AdministrationValueType = 'global' | 'segmentado'

interface CondominiumSettingsProps {
  condominiumId: number
  administrationValueType: AdministrationValueType | null
  administrationValueCop: number | null
  onUpdate: (data: { administration_value_type: AdministrationValueType; administration_value_cop: number | null }) => void
}

export default function CondominiumSettings({
  condominiumId,
  administrationValueType,
  administrationValueCop,
  onUpdate,
}: CondominiumSettingsProps) {
  const [type, setType] = useState<AdministrationValueType>(administrationValueType || 'global')
  const [cop, setCop] = useState<string>(
    administrationValueCop != null ? String(administrationValueCop) : '0'
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setType(administrationValueType || 'global')
    setCop(administrationValueCop != null ? String(administrationValueCop) : '0')
  }, [administrationValueType, administrationValueCop])

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    try {
      const payload: { administration_value_type: AdministrationValueType; administration_value_cop?: number | null } = {
        administration_value_type: type,
      }
      if (type === 'global') {
        const raw = cop.replace(/\D/g, '')
        const n = raw === '' ? 0 : parseInt(raw, 10)
        if (isNaN(n) || n < 0) {
          setMessage({ type: 'error', text: 'El valor debe ser un número positivo en COP.' })
          setSaving(false)
          return
        }
        payload.administration_value_cop = n
      } else {
        payload.administration_value_cop = null
      }
      await api.put(`/condominiums/${condominiumId}`, payload)
      onUpdate({
        administration_value_type: type,
        administration_value_cop: type === 'global' ? (payload.administration_value_cop ?? 0) : null,
      })
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' })
    } catch (e: any) {
      const detail = e.response?.data?.detail
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Error al guardar la configuración.' })
    } finally {
      setSaving(false)
    }
  }

  const formatCop = (v: string) => {
    const num = v.replace(/\D/g, '')
    if (num === '') return '0'
    const n = parseInt(num, 10)
    if (isNaN(n)) return '0'
    return n.toLocaleString('es-CO')
  }

  const handleCopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setCop(raw === '' ? '0' : raw)
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Configuración de valor de administración
      </h3>
      <div className="space-y-4 max-w-xl">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-3">Tipo de valor</p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="administration-type"
                checked={type === 'global'}
                onChange={() => setType('global')}
                className="rounded-full border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-gray-900 dark:text-gray-100">Global</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="administration-type"
                checked={type === 'segmentado'}
                onChange={() => setType('segmentado')}
                className="rounded-full border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-gray-900 dark:text-gray-100">Segmentado</span>
            </label>
          </div>
        </div>

        {type === 'global' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
              Valor de administración (COP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatCop(cop)}
              onChange={handleCopChange}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-200">
              Valor fijo en pesos colombianos para toda la administración del condominio. Por defecto 0.
            </p>
          </div>
        )}

        {message && (
          <div
            className={`px-4 py-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
