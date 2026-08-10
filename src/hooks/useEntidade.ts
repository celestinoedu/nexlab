import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Entidade } from '@/types/domain'

/** Busca uma única entidade por id — usada no cabeçalho da tela de extrato. */
export function useEntidade(id: string | undefined) {
  return useQuery({
    queryKey: ['entidade', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('entidades').select('*').eq('id', id as string).single()
      if (error) throw error
      return data as Entidade
    },
    enabled: Boolean(id),
  })
}
