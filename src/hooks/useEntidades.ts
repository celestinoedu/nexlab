import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Entidade, TipoEntidade } from '@/types/domain'

/**
 * Lista entidades (Clientes/Parceiros), opcionalmente filtradas por tipo.
 * Por padrão só traz ativas (uso nos comboboxes de OS); `incluirInativas`
 * traz tudo — usado na tela de cadastro, onde dá pra reativar um registro.
 */
export function useEntidades(tipo?: TipoEntidade, incluirInativas = false) {
  return useQuery({
    queryKey: ['entidades', tipo ?? 'todas', incluirInativas],
    queryFn: async () => {
      let query = supabase.from('entidades').select('*').order('nome', { ascending: true })

      if (!incluirInativas) query = query.eq('ativo', true)
      if (tipo) query = query.eq('tipo', tipo)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Entidade[]
    },
  })
}
