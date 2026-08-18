import * as React from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { useIsDemo } from '@/hooks/useEmpresaConfig'

const STALE_TIME_PADRAO = 30_000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_PADRAO,
      retry: 1,
    },
  },
})

/**
 * Na empresa Demonstração, nenhuma mutação toca o banco — cria/edita/exclui
 * fica só no `queryClient` (ver `src/lib/demoMode.ts`). Sem isso, o
 * `staleTime` padrão (30s) faria o TanStack Query refazer a leitura real do
 * Supabase em segundo plano (troca de aba, foco de janela, remontagem de
 * tela) e apagaria silenciosamente qualquer edição feita só em cache — ruim
 * bem no meio de uma demonstração ao vivo. Enquanto `is_demo` é `true`,
 * dados nunca ficam "stale": só são recarregados do banco de novo num novo
 * login (`queryClient.clear()` no `AuthProvider`).
 */
function DemoModeEffect() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  // Não consulta dados do tenant antes do login; além de desnecessário, isso
  // gerava uma chamada anônima que a RLS precisava rejeitar.
  const isDemo = useIsDemo(Boolean(user?.id))

  React.useEffect(() => {
    queryClient.setDefaultOptions({
      queries: { staleTime: isDemo ? Infinity : STALE_TIME_PADRAO, retry: 1 },
    })
  }, [isDemo, queryClient])

  return null
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DemoModeEffect />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  )
}
