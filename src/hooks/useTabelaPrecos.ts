import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TabelaPreco } from '@/types/domain'

export interface PrecoEntidadeServico {
  /** Preço (Cliente) ou comissão (Parceiro) — o único valor usado em cálculos (OS, Fechamento). */
  preco: number
  /** Só Parceiro: preço do serviço na tabela do próprio parceiro — referência, não entra em cálculo. */
  precoParceiro: number | null
}

/**
 * Preços/comissões específicos de uma entidade, indexados por servico_id —
 * usado para auto-preencher o formulário de OS (ver docs/business-rules.md).
 */
export function useTabelaPrecos(entidadeId: string | null) {
  return useQuery({
    queryKey: ['tabela_precos', entidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabela_precos')
        .select('*')
        .eq('entidade_id', entidadeId as string)

      if (error) throw error
      const porServico = new Map<string, PrecoEntidadeServico>()
      for (const row of (data ?? []) as TabelaPreco[]) {
        porServico.set(row.servico_id, { preco: row.preco, precoParceiro: row.preco_parceiro })
      }
      return porServico
    },
    enabled: Boolean(entidadeId),
  })
}
