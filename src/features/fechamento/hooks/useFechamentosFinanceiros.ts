import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, inserirNoCache, novoIdDemo } from '@/lib/demoMode'
import type { FechamentoFinanceiro } from '@/types/domain'

/** Todos os fechamentos financeiros já feitos (por mês) — usado para saber se o mês selecionado já está travado. */
export function useFechamentosFinanceiros() {
  return useQuery({
    queryKey: ['fechamentos_financeiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fechamentos_financeiros')
        .select('*')
        .order('mes_referencia', { ascending: false })

      if (error) throw error
      return (data ?? []) as FechamentoFinanceiro[]
    },
  })
}

export function useFecharMesFinanceiro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      mesReferencia,
      totalReceitas,
      totalDespesas,
    }: {
      mesReferencia: string
      totalReceitas: number
      totalDespesas: number
    }) => {
      const fechamento = {
        mes_referencia: mesReferencia,
        total_receitas: totalReceitas,
        total_despesas: totalDespesas,
        resultado: totalReceitas - totalDespesas,
        status: 'fechado' as const,
        data_fechamento: new Date().toISOString(),
      }

      if (isDemoAtivo(queryClient)) {
        const existente = queryClient
          .getQueryData<FechamentoFinanceiro[]>(['fechamentos_financeiros'])
          ?.find((f) => f.mes_referencia === mesReferencia)
        if (existente) {
          queryClient.setQueryData<FechamentoFinanceiro[]>(['fechamentos_financeiros'], (old) =>
            (old ?? []).map((f) => (f.mes_referencia === mesReferencia ? { ...f, ...fechamento } : f)),
          )
        } else {
          inserirNoCache(queryClient, ['fechamentos_financeiros'], { id: novoIdDemo(), ...fechamento } as FechamentoFinanceiro)
        }
        return
      }

      const { error } = await supabase.from('fechamentos_financeiros').upsert(fechamento, { onConflict: 'mes_referencia' })
      if (error) throw new Error('Não foi possível fechar o mês agora. Tente novamente.')
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['fechamentos_financeiros'])
    },
  })
}
