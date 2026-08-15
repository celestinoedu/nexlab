import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal } from '@/lib/demoMode'
import type { PrecoEntidadeServico } from '@/hooks/useTabelaPrecos'

export interface LinhaTabelaPreco {
  servico_id: string
  /** `null` = sem valor específico cadastrado (limpa a linha, se existir). */
  preco: number | null
  /** Só Parceiro: preço do serviço na tabela do próprio parceiro — referência, não entra em cálculo. */
  preco_parceiro: number | null
}

/**
 * Salva em lote a tabela de preços/comissões de uma entidade: faz upsert das
 * linhas com valor preenchido e apaga as que foram limpas (volta a usar o
 * preço padrão do catálogo). Escrita restrita a admin via RLS — ver
 * `docs/database-schema.md` § RLS.
 */
export function useTabelaPrecosMutations(entidadeId: string) {
  const queryClient = useQueryClient()

  const salvar = useMutation({
    mutationFn: async (linhas: LinhaTabelaPreco[]) => {
      if (isDemoAtivo(queryClient)) {
        queryClient.setQueryData<Map<string, PrecoEntidadeServico>>(['tabela_precos', entidadeId], (old) => {
          const porServico = new Map(old ?? [])
          for (const linha of linhas) {
            if (linha.preco === null) {
              porServico.delete(linha.servico_id)
            } else {
              porServico.set(linha.servico_id, { preco: linha.preco, precoParceiro: linha.preco_parceiro })
            }
          }
          return porServico
        })
        return
      }

      const comValor = linhas.filter((l) => l.preco !== null)
      const semValor = linhas.filter((l) => l.preco === null).map((l) => l.servico_id)

      if (comValor.length > 0) {
        const { error } = await supabase.from('tabela_precos').upsert(
          comValor.map((l) => ({
            entidade_id: entidadeId,
            servico_id: l.servico_id,
            preco: l.preco,
            preco_parceiro: l.preco_parceiro,
          })),
          { onConflict: 'entidade_id,servico_id' },
        )
        if (error) throw new Error('Não foi possível salvar a tabela de preços agora. Tente novamente.')
      }

      if (semValor.length > 0) {
        const { error } = await supabase
          .from('tabela_precos')
          .delete()
          .eq('entidade_id', entidadeId)
          .in('servico_id', semValor)
        if (error) throw new Error('Não foi possível salvar a tabela de preços agora. Tente novamente.')
      }
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['tabela_precos', entidadeId])
    },
  })

  return { salvar }
}
