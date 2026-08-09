import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Entidade, TipoEntidade } from '@/types/domain'

/** Lista entidades ativas (Clientes/Parceiros), opcionalmente filtradas por tipo. */
export function useEntidades(tipo?: TipoEntidade) {
  return useQuery({
    queryKey: ['entidades', tipo ?? 'todas'],
    queryFn: async () => {
      let query = supabase
        .from('entidades')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (tipo) query = query.eq('tipo', tipo)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Entidade[]
    },
  })
}
