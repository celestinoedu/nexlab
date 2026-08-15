import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Modo demonstração (empresa fictícia pra prospects testarem o NexLab, ver
 * `docs/database-schema.md` § Multi-tenant e `SETUP.md` § "Provisionar a
 * empresa Demonstração"): nenhuma mutação chega a ser enviada ao Supabase —
 * cada hook de mutação usa os helpers daqui pra checar `isDemoAtivo` logo no
 * início do `mutationFn` e, se for o caso, aplicar a alteração só no cache do
 * TanStack Query, retornando sem chamar a rede. `invalidarSeReal` substitui
 * o `queryClient.invalidateQueries(...)` incondicional que os hooks tinham
 * antes — invalidar em modo demo refaria a leitura real do Supabase e
 * apagaria a edição feita só em cache.
 *
 * Detecção: lê o cache da própria query `['empresa_config']` (mesma chave de
 * `useEmpresaConfig`) — funciona dentro de um `mutationFn` (sem hooks) porque
 * essa query já foi buscada antes de qualquer tela permitir uma ação de
 * escrita.
 */
export function isDemoAtivo(queryClient: QueryClient): boolean {
  const empresa = queryClient.getQueryData<{ is_demo?: boolean }>(['empresa_config'])
  return Boolean(empresa?.is_demo)
}

/** Só invalida (refaz a leitura real) quando não é modo demo. */
export function invalidarSeReal(queryClient: QueryClient, queryKey: QueryKey) {
  if (!isDemoAtivo(queryClient)) {
    queryClient.invalidateQueries({ queryKey })
  }
}

export function novoIdDemo(): string {
  return crypto.randomUUID()
}

export function agoraIso(): string {
  return new Date().toISOString()
}

/** Insere um registro no início de uma lista em cache (sem tocar o banco). */
export function inserirNoCache<T>(queryClient: QueryClient, queryKey: QueryKey, registro: T) {
  queryClient.setQueryData<T[]>(queryKey, (old) => [registro, ...(old ?? [])])
}

/** Atualiza (merge parcial) um registro por `id` numa lista em cache. */
export function atualizarNoCache<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: string,
  patch: Partial<T>,
) {
  queryClient.setQueryData<T[]>(queryKey, (old) => (old ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item)))
}

/** Remove um registro por `id` de uma lista em cache. */
export function removerDoCache<T extends { id: string }>(queryClient: QueryClient, queryKey: QueryKey, id: string) {
  queryClient.setQueryData<T[]>(queryKey, (old) => (old ?? []).filter((item) => item.id !== id))
}

/** Mensagem padrão pras ações bloqueadas em demo (Configurações). */
export const ERRO_INDISPONIVEL_DEMO = 'Indisponível na demonstração — esta é uma conta de testes, sem gravação real.'
