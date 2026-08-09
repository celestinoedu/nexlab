import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Demanda, DemandaComRelacoes, StatusDemanda } from '@/types/domain'

export interface DemandaFormInput {
  entidade_id: string
  servico_id: string
  cliente_final: string | null
  quantidade: number
  data_prevista: string | null
  valor_servico: number
  valor_comissao: number | null
  observacoes: string | null
}

export function useDemandaMutations() {
  const queryClient = useQueryClient()

  const createDemanda = useMutation({
    mutationFn: async (input: DemandaFormInput) => {
      const { data, error } = await supabase
        .from('demandas')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Demanda
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandas'] })
    },
  })

  const updateDemanda = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DemandaFormInput }) => {
      const { data, error } = await supabase
        .from('demandas')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Demanda
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandas'] })
    },
  })

  /** Muda o status (drag-and-drop no Kanban) com atualização otimista. */
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      data_entrega,
    }: {
      id: string
      status: StatusDemanda
      data_entrega?: string | null
    }) => {
      const patch: Partial<Demanda> = { status }
      if (data_entrega !== undefined) patch.data_entrega = data_entrega
      const { error } = await supabase.from('demandas').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status, data_entrega }) => {
      await queryClient.cancelQueries({ queryKey: ['demandas'] })
      const previous = queryClient.getQueryData<DemandaComRelacoes[]>(['demandas'])
      queryClient.setQueryData<DemandaComRelacoes[]>(['demandas'], (old) =>
        (old ?? []).map((d) =>
          d.id === id
            ? { ...d, status, data_entrega: data_entrega !== undefined ? data_entrega : d.data_entrega }
            : d,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['demandas'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['demandas'] })
    },
  })

  return { createDemanda, updateDemanda, updateStatus }
}
