import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Despesa } from '@/types/domain'

/** Lista todas as despesas, mais recentes primeiro. Filtros são aplicados no cliente pela tela. */
export function useDespesas() {
  return useQuery({
    queryKey: ['despesas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .order('data_despesa', { ascending: false })

      if (error) throw error
      return (data ?? []) as Despesa[]
    },
  })
}
