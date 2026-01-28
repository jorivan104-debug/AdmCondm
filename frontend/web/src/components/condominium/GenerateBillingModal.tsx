import { useState, useEffect } from 'react'
import api from '../../services/api'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface Property { id: number; code: string; type: string; block_id?: number | null; block?: { id: number; name: string } | null }
interface Block { id: number; name: string }

interface GenerateBillingModalProps {
  condominiumId: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type BillingMethod = 'global' | 'block' | 'unit'

export default function GenerateBillingModal({
  condominiumId,
  isOpen,
  onClose,
  onSuccess,
}: GenerateBillingModalProps) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [method, setMethod] = useState<BillingMethod>('global')
  const [baseAmount, setBaseAmount] = useState(0)
  const [dueDays, setDueDays] = useState(15)
  const [blockId, setBlockId] = useState<number | ''>('')
  const [propertyIds, setPropertyIds] = useState<number[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const now = new Date()
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
    setResult(null)
    setLoadError(null)
    const load = async () => {
      setLoading(true)
      try {
        const [blocksRes, propsRes, condoRes] = await Promise.all([
          api.get(`/blocks/condominium/${condominiumId}`),
          api.get(`/properties/condominium/${condominiumId}`),
          api.get(`/condominiums/${condominiumId}`),
        ])
        setBlocks(blocksRes.data ?? [])
        setProperties(propsRes.data ?? [])
        const cop = condoRes.data?.administration_value_cop
        setBaseAmount(typeof cop === 'number' ? cop : 0)
      } catch (e: any) {
        const d = e.response?.data?.detail
        const msg = typeof d === 'string' ? d : e.message || 'Error al cargar datos'
        setLoadError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isOpen, condominiumId])

  const toggleProperty = (id: number) => {
    setPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    setSubmitting(true)
    try {
      const mm = Number(month)
      const yy = Number(year)
      const amount = Number(baseAmount)
      const days = Number(dueDays)
      if (!Number.isInteger(mm) || mm < 1 || mm > 12) {
        setResult({ ok: false, message: 'Mes inválido.' })
        setSubmitting(false)
        return
      }
      if (!Number.isInteger(yy) || yy < 2020 || yy > 2100) {
        setResult({ ok: false, message: 'Año inválido.' })
        setSubmitting(false)
        return
      }
      const payload: {
        month: number
        year: number
        method: BillingMethod
        base_amount: number
        due_days: number
        block_id?: number
        property_ids?: number[]
      } = {
        month: mm,
        year: yy,
        method,
        base_amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        due_days: Number.isInteger(days) && days >= 1 && days <= 31 ? days : 15,
      }
      if (method === 'block' && blockId) payload.block_id = Number(blockId)
      if (method === 'unit' && propertyIds.length) payload.property_ids = [...propertyIds]

      const res = await api.post(
        `/administration-invoices/generate-billing?condominium_id=${condominiumId}`,
        payload
      )
      let message = res.data?.message ?? (res.data?.created?.length
        ? `Se generaron ${res.data.created.length} factura(s).`
        : 'Operación completada.')
      if (res.data?.created?.length) {
        message += ' Ve a la pestaña Facturación para verlas.'
      }
      setResult({ ok: true, message })
      onSuccess()
      setPropertyIds([])
      setBlockId('')
    } catch (err: any) {
      let msg: string
      const d = err.response?.data?.detail
      if (typeof d === 'string') {
        msg = d
      } else if (Array.isArray(d) && d.length) {
        msg = d.map((x: any) => x?.msg ?? x?.loc?.join('.') ?? JSON.stringify(x)).join('; ')
      } else if (d && typeof d === 'object') {
        msg = JSON.stringify(d)
      } else {
        msg = err.message || 'Error al generar facturación'
      }
      setResult({ ok: false, message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Generar facturación
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : loadError ? (
            <div className="py-6">
              <p className="text-red-600 dark:text-red-400 mb-4">{loadError}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Mes</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Año</label>
                  <input
                    type="number"
                    min={2020}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
                  Método de facturación
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="billing-method"
                      checked={method === 'global'}
                      onChange={() => setMethod('global')}
                      className="rounded-full border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                    <span className="text-gray-900 dark:text-gray-100">Global</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="billing-method"
                      checked={method === 'block'}
                      onChange={() => setMethod('block')}
                      className="rounded-full border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                    <span className="text-gray-900 dark:text-gray-100">Por bloque</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="billing-method"
                      checked={method === 'unit'}
                      onChange={() => setMethod('unit')}
                      className="rounded-full border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                    <span className="text-gray-900 dark:text-gray-100">Por unidad</span>
                  </label>
                </div>
              </div>

              {method === 'block' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Bloque
                  </label>
                  <select
                    value={blockId}
                    onChange={(e) => setBlockId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Seleccionar bloque</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {method === 'unit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                    Unidad(es)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700">
                    {properties.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={propertyIds.includes(p.id)}
                          onChange={() => toggleProperty(p.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                        />
                        <span className="text-gray-900 dark:text-gray-100">{p.code}</span>
                      </label>
                    ))}
                    {properties.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-200">No hay unidades</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                  Valor administración (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                  Días para vencimiento
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDays}
                  onChange={(e) => setDueDays(parseInt(e.target.value, 10) || 15)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {result && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    result.ok
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {result.message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (method === 'block' && !blockId) ||
                    (method === 'unit' && propertyIds.length === 0)
                  }
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Generando…' : 'Generar facturación'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
