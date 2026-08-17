import { Outlet } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { useIsDemo } from '@/hooks/useEmpresaConfig'

export function AppShell() {
  const isDemo = useIsDemo()

  return (
    <div className="app-screen flex overflow-hidden bg-mist">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isDemo && (
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-ink">
            <FlaskConical size={14} />
            <span className="hidden sm:inline">Modo Demonstração — dados fictícios, nada aqui é salvo de verdade</span>
            <span className="sm:hidden">Demonstração · dados fictícios</span>
          </div>
        )}
        <Topbar />
        <MobileNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
