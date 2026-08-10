import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Servico } from '@/types/domain'

/**
 * Lista o catálogo de serviços. Por padrão só os ativos (uso no formulário de
 * OS); `incluirInativos` traz tudo — usado na tela de cadastro do catálogo.
 */
export function useServicos(incluirInativos = false) {
  return useQuery({
    queryKey: ['servicos', incluirInativos],
    queryFn: async () => {
      let query = supabase.from('servicos').select('*').order('nome', { ascending: true })
      if (!incluirInativos) query = query.eq('ativo', true)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Servico[]
    },
  })
}
