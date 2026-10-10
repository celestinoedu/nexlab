import * as React from 'react'
import { Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FlaskConical } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { useEmpresaConfig, useIsDemo } from '@/hooks/useEmpresaConfig'
import { AvisoAssinatura } from '@/features/assinatura/AvisoAssinatura'
import { AcessoSuspenso } from '@/features/assinatura/AcessoSuspenso'
import { useMinhaAssinatura } from '@/features/assinatura/useMinhaAssinatura'
import { calcularBloqueio } from '@/features/assinatura/situacao'

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
          <ConteudoOuBloqueio />
        </main>
        <AvisoAssinatura />
      </div>
    </div>
  )
}

/**
 * Com a empresa bloqueada por atraso (migration 0027), qualquer rota mostra a
 * tela de pagamento. Ao ser liberada, recarrega os dados que o banco recusou.
 */
function ConteudoOuBloqueio() {
  const queryClient = useQueryClient()
  const { data: empresa } = useEmpresaConfig()
  const { data: assinatura } = useMinhaAssinatura(Boolean(empresa && !empresa.is_demo))
  const bloqueada = calcularBloqueio(assinatura).bloqueada
  const estavaBloqueada = React.useRef(false)

  React.useEffect(() => {
    if (estavaBloqueada.current && !bloqueada) {
      toast.success('Pagamento confirmado! Seu acesso ao NexLab foi liberado — pode fechar a aba do Mercado Pago.')
      void queryClient.invalidateQueries()
    }
    estavaBloqueada.current = bloqueada
  }, [bloqueada, queryClient])

  return bloqueada && assinatura ? <AcessoSuspenso assinatura={assinatura} /> : <Outlet />
}
