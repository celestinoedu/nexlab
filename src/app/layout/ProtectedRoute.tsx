import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

/** Bloqueia acesso a quem não está logado, preservando a rota de origem. */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-mist">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-50">
          <Loader2 className="animate-spin text-brand-600" size={24} />
        </div>
        <p className="text-xs font-medium text-slate-400">Preparando o NexLab…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
