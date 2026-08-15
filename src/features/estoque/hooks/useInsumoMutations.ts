import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, inserirNoCache, atualizarNoCache, removerDoCache, novoIdDemo, agoraIso } from '@/lib/demoMode'
import type { Insumo } from '@/types/domain'

export interface InsumoFormInput {
  nome: string
  categoria: string | null
  quantidade: number
  unidade: string | null
  valor_unitario: number
  local_estoque: string | null
  sinalizar_compra: boolean
  observacoes: string | null
}

export function useInsumoMutations() {
  const queryClient = useQueryClient()

  const createInsumo = useMutation({
    mutationFn: async (input: InsumoFormInput) => {
      if (isDemoAtivo(queryClient)) {
        const insumo: Insumo = {
          id: novoIdDemo(),
          ...input,
          created_by: null,
          created_at: agoraIso(),
          updated_at: agoraIso(),
        }
        inserirNoCache(queryClient, ['insumos'], insumo)
        return insumo
      }
      const { data, error } = await supabase.from('insumos').insert(input).select().single()
      if (error) throw new Error('Não foi possível salvar o insumo agora. Tente novamente.')
      return data as Insumo
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['insumos'])
    },
  })

  const updateInsumo = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: InsumoFormInput }) => {
      if (isDemoAtivo(queryClient)) {
        atualizarNoCache<Insumo>(queryClient, ['insumos'], id, { ...input, updated_at: agoraIso() })
        return
      }
      const { error } = await supabase.from('insumos').update(input).eq('id', id)
      if (error) throw new Error('Não foi possível salvar o insumo agora. Tente novamente.')
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['insumos'])
    },
  })

  const deleteInsumo = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoAtivo(queryClient)) {
        removerDoCache<Insumo>(queryClient, ['insumos'], id)
        return
      }
      const { error } = await supabase.from('insumos').delete().eq('id', id)
      if (error) throw new Error('Não foi possível excluir o insumo agora. Tente novamente.')
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['insumos'])
    },
  })

  return { createInsumo, updateInsumo, deleteInsumo }
}
