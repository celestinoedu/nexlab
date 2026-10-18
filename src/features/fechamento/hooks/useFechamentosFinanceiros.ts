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

      // Atualiza o fechamento do mês da própria empresa (a RLS só devolve os
      // dela) ou cria um novo. Não depende de qual restrição de unicidade o
      // banco tem — antes da migration 0028 ela era global por mês.
      const { data: existente, error: erroBusca } = await supabase
        .from('fechamentos_financeiros')
        .select('id')
        .eq('mes_referencia', mesReferencia)
        .maybeSingle()
      if (erroBusca) throw new Error('Não foi possível fechar o mês agora. Tente novamente.')

      const { error } = existente
        ? await supabase.from('fechamentos_financeiros').update(fechamento).eq('id', existente.id)
        : await supabase.from('fechamentos_financeiros').insert(fechamento)
      if (error) {
        throw new Error(
          error.code === '23505'
            ? 'Este mês não pôde ser fechado por uma restrição do banco. Peça à Lotus para aplicar a atualização 0028.'
            : 'Não foi possível fechar o mês agora. Tente novamente.',
        )
      }
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['fechamentos_financeiros'])
    },
  })
}

export function useReabrirMesFinanceiro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fechamento: FechamentoFinanceiro) => {
      const patch = {
        status: 'aberto' as const,
        data_fechamento: null,
      }

      if (isDemoAtivo(queryClient)) {
        queryClient.setQueryData<FechamentoFinanceiro[]>(['fechamentos_financeiros'], (old) =>
          (old ?? []).map((item) => (item.id === fechamento.id ? { ...item, ...patch } : item)),
        )
        return
      }

      const { error } = await supabase
        .from('fechamentos_financeiros')
        .update(patch)
        .eq('id', fechamento.id)

      if (error) throw new Error('Não foi possível reabrir o mês agora. Tente novamente.')
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['fechamentos_financeiros'])
    },
  })
}
