import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import GenerateBillingModal from './GenerateBillingModal'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Property {
  id: number
  code: string
  type: string
}

interface Transaction {
  id: number
  property_id: number | null
  type: string
  expense_type: string | null
  description: string
  amount: number
  transaction_date: string
  status: string
  property?: Property
}

interface AdminInvoice {
  id: number
  property_id: number
  total_amount: number
  paid_amount: number
  pending_amount: number
  month: number
  year: number
  issue_date: string
  property?: { code: string }
}

interface PropertyAccountingProps {
  condominiumId: number
  /** Si [] = sin unidad, mostrar vacío. Si number[] = solo esas unidades. */
  restrictToPropertyIds?: number[]
}

const EXPENSE_TYPES = {
  administration: 'Administración',
  fines: 'Multas',
  social_area_rental: 'Alquiler de Zona Social',
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
]

function formatCurrency(num: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(num)
}

export default function PropertyAccounting({ condominiumId, restrictToPropertyIds }: PropertyAccountingProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<AdminInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGenerateBilling, setShowGenerateBilling] = useState(false)

  const noUnit = restrictToPropertyIds?.length === 0
  const restrictIds = restrictToPropertyIds && restrictToPropertyIds.length > 0 ? restrictToPropertyIds : null

  useEffect(() => {
    if (noUnit) {
      setLoading(false)
      setInvoicesLoading(false)
      return
    }
    loadProperties()
    loadTransactions()
    loadInvoices()
  }, [condominiumId, selectedProperty, noUnit, restrictIds])

  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true)
      const res = await api.get(`/administration-invoices/condominium/${condominiumId}`)
      setInvoices(res.data ?? [])
    } catch (e: any) {
      console.error('Error loading invoices:', e)
      setInvoices([])
    } finally {
      setInvoicesLoading(false)
    }
  }

  const loadProperties = async () => {
    try {
      const response = await api.get(`/properties/condominium/${condominiumId}`)
      setProperties(response.data ?? [])
    } catch (err: any) {
      console.error('Error loading properties:', err)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/accounting/transactions/condominium/${condominiumId}`)
      let list = response.data ?? []
      if (restrictIds?.length) list = list.filter((t: Transaction) => t.property_id != null && restrictIds.includes(t.property_id))
      const filtered = selectedProperty
        ? list.filter((t: Transaction) => t.property_id === selectedProperty)
        : list
      setTransactions(filtered)
    } catch (err: any) {
      console.error('Error loading transactions:', err)
      const msg = err.response?.data?.detail ?? err.message ?? 'Error al cargar las transacciones'
      setError(typeof msg === 'string' ? msg : 'Error al cargar las transacciones')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const getExpenseTypeLabel = (expenseType: string | null) => {
    if (!expenseType) return 'Otro'
    return EXPENSE_TYPES[expenseType as keyof typeof EXPENSE_TYPES] || expenseType
  }

  const now = useMemo(() => new Date(), [])
  const thisMonth = now.getMonth() + 1
  const thisYear = now.getFullYear()
  const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1
  const lastYear = thisMonth === 1 ? thisYear - 1 : thisYear

  const invoicesFiltered = useMemo(() => {
    let list = invoices
    if (restrictIds?.length) list = list.filter((inv) => restrictIds.includes(inv.property_id))
    if (selectedProperty) list = list.filter((inv) => inv.property_id === selectedProperty)
    return list
  }, [invoices, selectedProperty, restrictIds])

  const { totalFacturadoEsteMes, totalFacturadoUltimoMes, totalPagado, saldo } = useMemo(() => {
    let este = 0
    let ultimo = 0
    let pagado = 0
    let pend = 0
    for (const inv of invoicesFiltered) {
      if (inv.month === thisMonth && inv.year === thisYear) este += inv.total_amount
      if (inv.month === lastMonth && inv.year === lastYear) ultimo += inv.total_amount
      pagado += inv.paid_amount
      pend += inv.pending_amount
    }
    return {
      totalFacturadoEsteMes: este,
      totalFacturadoUltimoMes: ultimo,
      totalPagado: pagado,
      saldo: pend,
    }
  }, [invoicesFiltered, thisMonth, thisYear, lastMonth, lastYear])

  const debtByUnit = useMemo(() => {
    const byId: Record<number, { property_id: number; code: string; pending: number }> = {}
    for (const inv of invoicesFiltered) {
      const code = inv.property?.code ?? properties.find((p) => p.id === inv.property_id)?.code ?? `#${inv.property_id}`
      if (!byId[inv.property_id]) {
        byId[inv.property_id] = { property_id: inv.property_id, code, pending: 0 }
      }
      byId[inv.property_id].pending += inv.pending_amount
    }
    return Object.values(byId).sort((a, b) => b.pending - a.pending)
  }, [invoicesFiltered, properties])

  const pieData = useMemo(
    () => debtByUnit.filter((u) => u.pending > 0).map((u) => ({ name: u.code, value: u.pending })),
    [debtByUnit]
  )

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  if (noUnit) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contabilidad por Residencia</h2>
        <p className="text-gray-600 dark:text-gray-200">No tiene unidades asociadas. La contabilidad no muestra información.</p>
      </div>
    )
  }

  if (loading && transactions.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contabilidad por Residencia</h2>
          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">Gestión de gastos por unidad del condominio</p>
        </div>
        <div className="flex gap-2">
          {!restrictIds && (
            <>
          <button
            type="button"
            onClick={() => setShowGenerateBilling(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generar facturación
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Transacción
          </button>
          </>
          )}
        </div>
      </div>

      <GenerateBillingModal
        condominiumId={condominiumId}
        isOpen={showGenerateBilling}
        onClose={() => setShowGenerateBilling(false)}
        onSuccess={() => {
          loadTransactions()
          loadInvoices()
        }}
      />

      {/* Property Filter */}
      <div className="mb-6">
        <label htmlFor="property-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
          Filtrar por Unidad
        </label>
        <select
          id="property-filter"
          value={selectedProperty || ''}
          onChange={(e) => setSelectedProperty(e.target.value ? parseInt(e.target.value) : null)}
          className="block w-full md:w-64 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Todas las unidades</option>
          {(restrictIds ? properties.filter((p) => restrictIds.includes(p.id)) : properties).map((property) => (
            <option key={property.id} value={property.id}>
              {property.code}
            </option>
          ))}
        </select>
      </div>

      {/* Resumen facturación: labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-200">
            Total facturado este mes ({monthNames[thisMonth - 1]} {thisYear})
          </p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {invoicesLoading ? '…' : formatCurrency(totalFacturadoEsteMes)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-200">
            Total facturado último mes ({monthNames[lastMonth - 1]} {lastYear})
          </p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {invoicesLoading ? '…' : formatCurrency(totalFacturadoUltimoMes)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-200">Lo que se ha pagado</p>
          <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">
            {invoicesLoading ? '…' : formatCurrency(totalPagado)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-200">Saldo pendiente</p>
          <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">
            {invoicesLoading ? '…' : formatCurrency(saldo)}
          </p>
        </div>
      </div>

      {/* Total adeudado por unidad: gráfica + lista */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Total adeudado por unidad (torta)
          </h3>
          {invoicesLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-200">Cargando…</div>
          ) : pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-200">
              No hay saldo pendiente por unidad.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Total adeudado por unidad (lista)
          </h3>
          {invoicesLoading ? (
            <p className="text-gray-500 dark:text-gray-200">Cargando…</p>
          ) : debtByUnit.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-200">No hay unidades con facturación.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-600 max-h-64 overflow-y-auto">
              {debtByUnit.map((u) => (
                <li
                  key={u.property_id}
                  className="flex justify-between items-center py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{u.code}</span>
                  <span className={`font-semibold ${u.pending > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-200'}`}>
                    {formatCurrency(u.pending)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No hay transacciones</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-200">
            {selectedProperty
              ? 'No hay transacciones para esta unidad.'
              : 'Comienza agregando una nueva transacción.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                  Tipo de Gasto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {transaction.property?.code ?? properties.find((p) => p.id === transaction.property_id)?.code ?? 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {transaction.expense_type ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {getExpenseTypeLabel(transaction.expense_type)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{transaction.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${transaction.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {transaction.status === 'completed'
                        ? 'Completado'
                        : transaction.status === 'pending'
                        ? 'Pendiente'
                        : 'Cancelado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

