import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
      const { error } = await supabase.from('fechamentos_financeiros').upsert(
        {
          mes_referencia: mesReferencia,
          total_receitas: totalReceitas,
          total_despesas: totalDespesas,
          resultado: totalReceitas - totalDespesas,
          status: 'fechado',
          data_fechamento: new Date().toISOString(),
        },
        { onConflict: 'mes_referencia' },
      )
      if (error) throw new Error('Não foi possível fechar o mês agora. Tente novamente.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fechamentos_financeiros'] })
    },
  })
}
