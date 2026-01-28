import { useState, useEffect } from 'react'
import api from '../../services/api'

interface Property {
  id: number
  code: string
  type: string
}

interface AdministrationInvoice {
  id: number
  condominium_id: number
  property_id: number
  invoice_number: string
  month: number
  year: number
  issue_date: string
  due_date: string
  base_amount: number
  additional_charges: number
  discounts: number
  total_amount: number
  paid_amount: number
  pending_amount: number
  status: string
  description: string | null
  notes: string | null
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string | null
  property?: Property
}

interface InvoicePayment {
  id: number
  invoice_id: number
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string | null
  notes: string | null
  recorded_by: number
  created_at: string
  updated_at: string | null
}

interface AdministrationInvoicesProps {
  condominiumId: number
  /** Si se define, solo facturas de estas propiedades. [] = ninguna. */
  restrictToPropertyIds?: number[]
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const PAYMENT_METHODS = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia Bancaria',
  check: 'Cheque',
  card: 'Tarjeta',
  other: 'Otro'
}

export default function AdministrationInvoices({ condominiumId, restrictToPropertyIds }: AdministrationInvoicesProps) {
  const [invoices, setInvoices] = useState<AdministrationInvoice[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const noUnit = restrictToPropertyIds?.length === 0
  const restrictIds = restrictToPropertyIds && restrictToPropertyIds.length > 0 ? restrictToPropertyIds : null
  const visibleInvoices =
    restrictIds == null
      ? invoices
      : restrictToPropertyIds!.length === 0
        ? []
        : invoices.filter((inv) => restrictToPropertyIds!.includes(inv.property_id))
  const isRestricted = restrictToPropertyIds !== undefined
  const [selectedInvoice, setSelectedInvoice] = useState<AdministrationInvoice | null>(null)
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState<number[]>([])
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    property_id: '',
    month: '',
    year: '',
    status: ''
  })
  
  const [invoiceFormData, setInvoiceFormData] = useState({
    property_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    issue_date: '',
    due_date: '',
    base_amount: 0,
    additional_charges: 0,
    discounts: 0,
    description: '',
    notes: ''
  })

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  })

  const [generateFormData, setGenerateFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    base_amount: 0,
    due_days: 15
  })

  useEffect(() => {
    if (noUnit) {
      setLoading(false)
      return
    }
    loadProperties()
    loadInvoices()
  }, [condominiumId, noUnit])

  useEffect(() => {
    if (noUnit) return
    loadInvoices()
  }, [filters, noUnit])

  useEffect(() => {
    if (selectedInvoice) {
      loadInvoicePayments(selectedInvoice.id)
    }
  }, [selectedInvoice])

  const loadProperties = async () => {
    try {
      const response = await api.get(`/properties/?condominium_id=${condominiumId}`)
      setProperties(response.data)
    } catch (error: any) {
      console.error('Error loading properties:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      setLoading(true)
      let url = `/administration-invoices/condominium/${condominiumId}`
      const params = new URLSearchParams()
      if (filters.property_id) params.append('property_id', filters.property_id)
      if (filters.month) params.append('month', filters.month)
      if (filters.year) params.append('year', filters.year)
      if (filters.status) params.append('status_filter', filters.status)
      if (params.toString()) url += '?' + params.toString()
      
      const response = await api.get(url)
      setInvoices(response.data)
    } catch (error: any) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoicePayments = async (invoiceId: number) => {
    try {
      const response = await api.get(`/administration-invoices/${invoiceId}/payments`)
      setPayments(response.data)
    } catch (error: any) {
      console.error('Error loading payments:', error)
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const total = invoiceFormData.base_amount + invoiceFormData.additional_charges - invoiceFormData.discounts
      await api.post('/administration-invoices/', {
        ...invoiceFormData,
        condominium_id: condominiumId,
        property_id: parseInt(invoiceFormData.property_id),
        total_amount: total
      })
      setShowCreateForm(false)
      resetInvoiceForm()
      loadInvoices()
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      alert('Error al crear la factura: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleGenerateMonthly = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!generateFormData.base_amount || generateFormData.base_amount <= 0) {
      alert('El monto base debe ser mayor a 0')
      return
    }
    
    const confirmMessage = `¿Generar facturas para ${MONTHS[generateFormData.month - 1]} ${generateFormData.year}?\n\n` +
      `Monto base: $${generateFormData.base_amount.toFixed(2)}\n` +
      `Se crearán facturas para todas las propiedades activas.`
    
    if (!window.confirm(confirmMessage)) {
      return
    }
    
    try {
      await api.post(`/administration-invoices/generate-monthly?condominium_id=${condominiumId}&month=${generateFormData.month}&year=${generateFormData.year}&base_amount=${generateFormData.base_amount}&due_days=${generateFormData.due_days}`)
      setShowGenerateForm(false)
      resetGenerateForm()
      loadInvoices()
      alert('Facturas generadas exitosamente')
    } catch (error: any) {
      console.error('Error generating invoices:', error)
      alert('Error al generar facturas: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice) return
    
    if (paymentFormData.amount <= 0) {
      alert('El monto del pago debe ser mayor a 0')
      return
    }
    
    if (paymentFormData.amount > selectedInvoice.pending_amount) {
      alert(`El monto excede el pendiente. Pendiente: $${selectedInvoice.pending_amount.toFixed(2)}`)
      return
    }
    
    try {
      await api.post(`/administration-invoices/${selectedInvoice.id}/payments`, {
        ...paymentFormData,
        invoice_id: selectedInvoice.id
      })
      setShowPaymentForm(false)
      resetPaymentForm()
      loadInvoices()
      if (selectedInvoice) {
        loadInvoicePayments(selectedInvoice.id)
      }
    } catch (error: any) {
      console.error('Error creating payment:', error)
      alert('Error al registrar el pago: ' + (error.response?.data?.detail || error.message))
    }
  }

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      property_id: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      issue_date: '',
      due_date: '',
      base_amount: 0,
      additional_charges: 0,
      discounts: 0,
      description: '',
      notes: ''
    })
  }

  const resetPaymentForm = () => {
    setPaymentFormData({
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: ''
    })
  }

  const resetGenerateForm = () => {
    setGenerateFormData({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      base_amount: 0,
      due_days: 15
    })
  }

  const togglePrintSelection = (id: number) => {
    setSelectedForPrint((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllForPrint = () => {
    if (selectedForPrint.length === invoices.length) {
      setSelectedForPrint([])
    } else {
      setSelectedForPrint(visibleInvoices.map((inv) => inv.id))
    }
  }

  const handleDeleteInvoice = async (invoice: AdministrationInvoice) => {
    const msg = `¿Eliminar la factura ${invoice.invoice_number} (${invoice.property?.code || 'propiedad'} - ${MONTHS[invoice.month - 1]} ${invoice.year})?\n\nLa factura se desactivará y ya no aparecerá en la lista.`
    if (!window.confirm(msg)) return
    setDeletingId(invoice.id)
    setDeleteError(null)
    try {
      await api.delete(`/administration-invoices/${invoice.id}`)
      setSelectedForPrint((prev) => prev.filter((id) => id !== invoice.id))
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(null)
        setShowPaymentForm(false)
      }
      loadInvoices()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setDeleteError(typeof detail === 'string' ? detail : 'No se pudo eliminar la factura.')
    } finally {
      setDeletingId(null)
    }
  }

  const handlePrintSelected = () => {
    const list = visibleInvoices.filter((inv) => selectedForPrint.includes(inv.id))
    if (list.length === 0) return
    const formatDateShort = (d: string) =>
      new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    const rows = list
      .map(
        (inv) => `
      <div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:12px;break-inside:avoid;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:14px;">
          <div><span style="color:#666">Factura</span><div style="font-weight:600">${escapeHtml(inv.invoice_number)}</div></div>
          <div><span style="color:#666">Unidad</span><div>${escapeHtml(String(inv.property?.code ?? properties.find((p) => p.id === inv.property_id)?.code ?? inv.property_id))}</div></div>
          <div><span style="color:#666">Período</span><div>${MONTHS[inv.month - 1]} ${inv.year}</div></div>
          <div><span style="color:#666">Estado</span><div>${escapeHtml(getStatusText(inv.status))}</div></div>
          <div><span style="color:#666">Emisión</span><div>${formatDateShort(inv.issue_date)}</div></div>
          <div><span style="color:#666">Vencimiento</span><div>${formatDateShort(inv.due_date)}</div></div>
          <div><span style="color:#666">Total</span><div style="font-weight:600">${formatCurrency(inv.total_amount)}</div></div>
          <div><span style="color:#666">Pendiente</span><div>${formatCurrency(inv.pending_amount)}</div></div>
        </div>
      </div>`
      )
      .join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facturas de Administración</title>
<style>body{font-family:system-ui,sans-serif;margin:16px;color:#111}.no-print{display:block}@media print{.no-print{display:none!important}}</style></head>
<body>
  <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #eee">
    <h2 style="margin:0">Facturas de Administración</h2>
    <span>
      <button onclick="window.print()" style="margin-right:8px;padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">Imprimir</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer">Cerrar</button>
    </span>
  </div>
  <h3 style="margin-top:0">${list.length} factura(s) seleccionada(s)</h3>
  ${rows}
</body></html>`
    const w = window.open('', '_blank', 'width=800,height=700')
    if (w) {
      w.document.write(html)
      w.document.close()
    } else {
      alert('Permite ventanas emergentes para imprimir.')
    }
  }

  function escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'partial':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagada'
      case 'partial':
        return 'Pago Parcial'
      case 'pending':
        return 'Pendiente'
      case 'overdue':
        return 'Vencida'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  if (noUnit) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Facturas de Administración</h2>
        <p className="text-gray-600 dark:text-gray-200">No tiene unidades asociadas. La facturación no está disponible.</p>
      </div>
    )
  }

  if (loading && invoices.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Facturas de Administración</h2>
          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">Liquidación mensual de servicios de administración</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedForPrint.length > 0 && (
            <button
              type="button"
              onClick={handlePrintSelected}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir ({selectedForPrint.length})
            </button>
          )}
          {!isRestricted && (
            <>
          <button
            type="button"
            onClick={() => setShowGenerateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generar Mensual
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Factura
          </button>
          </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Unidad</label>
            <select
              value={filters.property_id}
              onChange={(e) => setFilters({ ...filters, property_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas</option>
              {(restrictIds ? properties.filter((p) => restrictIds.includes(p.id)) : properties).map(prop => (
                <option key={prop.id} value={prop.id}>{prop.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Mes</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Año</label>
            <input
              type="number"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              placeholder="Año"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Pago Parcial</option>
              <option value="paid">Pagada</option>
              <option value="overdue">Vencida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Monthly Form */}
      {showGenerateForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">Generar Facturas Mensuales</h3>
            <form onSubmit={handleGenerateMonthly}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Mes</label>
                  <select
                    required
                    value={generateFormData.month}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Año</label>
                  <input
                    type="number"
                    required
                    min="2020"
                    max="2100"
                    value={generateFormData.year}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Monto Base</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={generateFormData.base_amount}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, base_amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Días para Vencimiento</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={generateFormData.due_days}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, due_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateForm(false)
                    resetGenerateForm()
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Generar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">Crear Nueva Factura</h3>
            <form onSubmit={handleCreateInvoice}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Propiedad</label>
                  <select
                    required
                    value={invoiceFormData.property_id}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, property_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Seleccione una propiedad</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.code}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Mes</label>
                    <select
                      required
                      value={invoiceFormData.month}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index + 1} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Año</label>
                    <input
                      type="number"
                      required
                      min="2020"
                      max="2100"
                      value={invoiceFormData.year}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Fecha de Emisión</label>
                    <input
                      type="date"
                      required
                      value={invoiceFormData.issue_date}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, issue_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      required
                      value={invoiceFormData.due_date}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Monto Base</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={invoiceFormData.base_amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, base_amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Cargos Adicionales</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceFormData.additional_charges}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, additional_charges: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Descuentos</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceFormData.discounts}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, discounts: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Descripción</label>
                  <textarea
                    value={invoiceFormData.description}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    resetInvoiceForm()
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Crear Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex justify-between items-center">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleInvoices.length > 0 && selectedForPrint.length === visibleInvoices.length}
                      onChange={toggleSelectAllForPrint}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Impr.</span>
                  </label>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Factura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Unidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Monto Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Pagado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Pendiente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Vencimiento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedForPrint.includes(invoice.id)}
                        onChange={() => togglePrintSelection(invoice.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                      />
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {invoice.property?.code ?? properties.find((p) => p.id === invoice.property_id)?.code ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {MONTHS[invoice.month - 1]} {invoice.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {formatCurrency(invoice.paid_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {formatCurrency(invoice.pending_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-300"
                      >
                        Ver
                      </button>
                      {invoice.pending_amount > 0 && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowPaymentForm(true)
                              setPaymentFormData({
                                ...paymentFormData,
                                amount: invoice.pending_amount
                              })
                            }}
                            className="text-green-600 hover:text-green-900 dark:hover:text-green-300"
                          >
                            Pagar
                          </button>
                        </>
                      )}
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(invoice)}
                        disabled={deletingId === invoice.id}
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                        title="Eliminar factura (no se puede si tiene pagos)"
                      >
                        {deletingId === invoice.id ? '…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleInvoices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-200">No hay facturas registradas</p>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedInvoice.invoice_number}</h3>
                <p className="text-gray-600 dark:text-gray-200">
                  Unidad {selectedInvoice.property?.code ?? properties.find((p) => p.id === selectedInvoice.property_id)?.code ?? selectedInvoice.property_id} — {MONTHS[selectedInvoice.month - 1]} {selectedInvoice.year}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Información de la Factura</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Emisión:</strong> {formatDate(selectedInvoice.issue_date)}</p>
                  <p><strong>Vencimiento:</strong> {formatDate(selectedInvoice.due_date)}</p>
                  <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedInvoice.status)}`}>{getStatusText(selectedInvoice.status)}</span></p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Montos</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Base:</strong> {formatCurrency(selectedInvoice.base_amount)}</p>
                  <p><strong>Adicionales:</strong> {formatCurrency(selectedInvoice.additional_charges)}</p>
                  <p><strong>Descuentos:</strong> {formatCurrency(selectedInvoice.discounts)}</p>
                  <p className="pt-2 border-t"><strong>Total:</strong> {formatCurrency(selectedInvoice.total_amount)}</p>
                  <p className="text-green-600"><strong>Pagado:</strong> {formatCurrency(selectedInvoice.paid_amount)}</p>
                  <p className="text-red-600"><strong>Pendiente:</strong> {formatCurrency(selectedInvoice.pending_amount)}</p>
                </div>
              </div>
            </div>

            {selectedInvoice.description && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Descripción</h4>
                <p className="text-gray-600 dark:text-gray-200">{selectedInvoice.description}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Pagos Registrados</h4>
                {selectedInvoice.pending_amount > 0 && (
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    + Registrar Pago
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Monto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Método</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Referencia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {PAYMENT_METHODS[payment.payment_method as keyof typeof PAYMENT_METHODS] || payment.payment_method}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {payment.reference_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {payment.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-200">
                    No hay pagos registrados
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">Registrar Pago</h3>
            <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
              Factura: {selectedInvoice.invoice_number}<br />
              Pendiente: {formatCurrency(selectedInvoice.pending_amount)}
            </p>
            <form onSubmit={handleCreatePayment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Monto</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={selectedInvoice.pending_amount}
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Método de Pago</label>
                  <select
                    required
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Número de Referencia</label>
                  <input
                    type="text"
                    value={paymentFormData.reference_number}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                    placeholder="Número de transferencia, cheque, etc."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Notas</label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false)
                    resetPaymentForm()
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
