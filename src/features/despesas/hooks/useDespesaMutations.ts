import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
      const { data, error } = await supabase.from('despesas').insert(input).select().single()
      if (error) throw new Error('Não foi possível salvar a despesa agora. Tente novamente.')
      return data as Despesa
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] })
    },
  })

  const updateDespesa = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DespesaFormInput }) => {
      const { error } = await supabase.from('despesas').update(input).eq('id', id)
      if (error) throw new Error('Não foi possível salvar a despesa agora. Tente novamente.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] })
    },
  })

  const deleteDespesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('despesas').delete().eq('id', id)
      if (error) throw new Error('Não foi possível excluir a despesa agora. Tente novamente.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] })
    },
  })

  return { createDespesa, updateDespesa, deleteDespesa }
}
