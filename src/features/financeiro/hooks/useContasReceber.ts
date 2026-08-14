import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ContaReceberComRelacoes } from '@/types/domain'

/**
 * Lista todas as linhas de Contas a Receber, com a entidade e a OS de origem
 * já unidas. Filtros (status, mês, entidade) são aplicados no cliente pela
 * tela — mesmo padrão de useOrdensServico.
 */
export function useContasReceber() {
  return useQuery({
    queryKey: ['contas_receber'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select(
          '*, entidade:entidades(id,nome,tipo), ordem:ordens_servico(id,numero_os,cliente_final,nome_paciente,data_entrega)',
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as ContaReceberComRelacoes[]
    },
  })
}
