import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OrdemServicoComRelacoes } from '@/types/domain'

/**
 * Lista todas as Ordens de Serviço com entidade e itens (+ serviço de cada
 * item) já unidos (join do PostgREST). Filtros (status, mês, busca) são
 * aplicados no cliente pelas telas — volume esperado de um laboratório
 * pequeno/médio não justifica filtro no servidor.
 */
export function useOrdensServico() {
  return useQuery({
    queryKey: ['ordens_servico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(
          '*, entidade:entidades(id,nome,tipo), itens:ordem_servico_itens(*, servico:servicos(id,nome))',
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as OrdemServicoComRelacoes[]
    },
  })
}
