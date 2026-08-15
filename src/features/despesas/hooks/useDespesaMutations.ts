import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, inserirNoCache, atualizarNoCache, removerDoCache, novoIdDemo, agoraIso } from '@/lib/demoMode'
import type { Despesa } from '@/types/domain'

export interface DespesaFormInput {
  categoria: string | null
  descricao: string
  valor: number
  data_despesa: string
  observacoes: string | null
}

export function useDespesaMutations() {
  const queryClient = useQueryClient()

  const createDespesa = useMutation({
    mutationFn: async (input: DespesaFormInput) => {
      if (isDemoAtivo(queryClient)) {
        const despesa: Despesa = {
          id: novoIdDemo(),
          ...input,
          created_by: null,
          created_at: agoraIso(),
          updated_at: agoraIso(),
        }
        inserirNoCache(queryClient, ['despesas'], despesa)
        return despesa
      }
      const { data, error } = await supabase.from('despesas').insert(input).select().single()
      if (error) throw new Error('Não foi possível salvar a despesa agora. Tente novamente.')
      return data as Despesa
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['despesas'])
    },
  })

  const updateDespesa = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DespesaFormInput }) => {
      if (isDemoAtivo(queryClient)) {
        atualizarNoCache<Despesa>(queryClient, ['despesas'], id, { ...input, updated_at: agoraIso() })
        return
      }
      const { error } = await supabase.from('despesas').update(input).eq('id', id)
      if (error) throw new Error('Não foi possível salvar a despesa agora. Tente novamente.')
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['despesas'])
    },
  })

  const deleteDespesa = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoAtivo(queryClient)) {
        removerDoCache<Despesa>(queryClient, ['despesas'], id)
        return
      }
      const { error } = await supabase.from('despesas').delete().eq('id', id)
      if (error) throw new Error('Não foi possível excluir a despesa agora. Tente novamente.')
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['despesas'])
    },
  })

  return { createDespesa, updateDespesa, deleteDespesa }
}
