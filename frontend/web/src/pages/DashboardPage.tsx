import { useAuthStore } from '../store/authStore'

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <p className="text-gray-600">
          Bienvenido, {user?.full_name || user?.email}
        </p>
        <p className="text-gray-500 mt-4">
          Esta es la página principal. Aquí se mostrarán los módulos del sistema.
        </p>
      </div>
    </div>
  )
}

