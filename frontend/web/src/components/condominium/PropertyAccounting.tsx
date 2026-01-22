import { useState, useEffect } from 'react'
import api from '../../services/api'

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

interface PropertyAccountingProps {
  condominiumId: number
}

const EXPENSE_TYPES = {
  administration: 'Administración',
  fines: 'Multas',
  social_area_rental: 'Alquiler de Zona Social',
}

export default function PropertyAccounting({ condominiumId }: PropertyAccountingProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProperties()
    loadTransactions()
  }, [condominiumId, selectedProperty])

  const loadProperties = async () => {
    try {
      const response = await api.get(`/properties/?condominium_id=${condominiumId}`)
      setProperties(response.data)
    } catch (err: any) {
      console.error('Error loading properties:', err)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoading(true)
      let url = `/accounting/transactions/?condominium_id=${condominiumId}`
      if (selectedProperty) {
        url += `&property_id=${selectedProperty}`
      }
      const response = await api.get(url)
      setTransactions(response.data)
    } catch (err: any) {
      console.error('Error loading transactions:', err)
      setError('Error al cargar las transacciones')
    } finally {
      setLoading(false)
    }
  }

  const getExpenseTypeLabel = (expenseType: string | null) => {
    if (!expenseType) return 'Otro'
    return EXPENSE_TYPES[expenseType as keyof typeof EXPENSE_TYPES] || expenseType
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
          <h2 className="text-2xl font-bold text-gray-900">Contabilidad por Residencia</h2>
          <p className="text-sm text-gray-600 mt-1">Gestión de gastos por unidad del condominio</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Transacción
        </button>
      </div>

      {/* Property Filter */}
      <div className="mb-6">
        <label htmlFor="property-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por Unidad
        </label>
        <select
          id="property-filter"
          value={selectedProperty || ''}
          onChange={(e) => setSelectedProperty(e.target.value ? parseInt(e.target.value) : null)}
          className="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Todas las unidades</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.code}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
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
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay transacciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedProperty
              ? 'No hay transacciones para esta unidad.'
              : 'Comienza agregando una nueva transacción.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Gasto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.property?.code || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.expense_type ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getExpenseTypeLabel(transaction.expense_type)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${transaction.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
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

