import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useProfile } from '@/hooks/useProfile'

export function OnboardingGate() {
  const { data: empresa, isLoading: carregandoEmpresa } = useEmpresaConfig()
  const { data: profile, isLoading: carregandoPerfil } = useProfile()

  if (carregandoEmpresa || carregandoPerfil) {
    return (
      <div className="app-min-screen flex flex-col items-center justify-center gap-3 bg-mist">
        <Loader2 className="animate-spin text-brand-600" size={28} />
        <p className="text-sm text-slate-500">Preparando seu espaço…</p>
      </div>
    )
  }

  if (profile?.role === 'admin' && empresa?.onboarding_concluido === false) {
    return <Navigate to="/primeiros-passos" replace />
  }

  return <Outlet />
}
