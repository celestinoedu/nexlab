import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DemandaComRelacoes } from '@/types/domain'

/**
 * Lista todas as demandas com entidade/serviço já unidos (join do PostgREST).
 * Filtros (status, mês, busca) são aplicados no cliente pelas telas — volume
 * esperado de um laboratório pequeno/médio não justifica filtro no servidor.
 */
export function useDemandas() {
  return useQuery({
    queryKey: ['demandas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demandas')
        .select('*, entidade:entidades(id,nome,tipo), servico:servicos(id,nome)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as DemandaComRelacoes[]
    },
  })
}
