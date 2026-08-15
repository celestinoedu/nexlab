import { Outlet } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { useIsDemo } from '@/hooks/useEmpresaConfig'

export function AppShell() {
  const isDemo = useIsDemo()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isDemo && (
          <div className="flex items-center justify-center gap-2 bg-brand-600 px-4 py-1.5 text-center text-xs font-medium text-white">
            <FlaskConical size={14} />
            Modo Demonstração — dados fictícios, nada aqui é salvo de verdade
          </div>
        )}
        <Topbar />
        <MobileNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
