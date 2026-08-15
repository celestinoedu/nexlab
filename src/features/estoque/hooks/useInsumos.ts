import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Insumo } from '@/types/domain'

/** Lista todos os insumos do estoque, mais recentes primeiro. Filtros são aplicados no cliente pela tela. */
export function useInsumos() {
  return useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insumos').select('*').order('nome', { ascending: true })
      if (error) throw error
      return (data ?? []) as Insumo[]
    },
  })
}
