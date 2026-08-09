import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Servico } from '@/types/domain'

/** Lista o catálogo de serviços ativos. */
export function useServicos() {
  return useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) throw error
      return (data ?? []) as Servico[]
    },
  })
}
