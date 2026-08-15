import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, novoIdDemo, agoraIso } from '@/lib/demoMode'
import type { Servico } from '@/types/domain'

export interface ServicoFormInput {
  nome: string
  categoria: string | null
  preco_padrao: number
  tempo_medio_dias: number | null
  ativo: boolean
}

function traduzErroSalvar(message: string): string {
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
    return 'Já existe um serviço com esse nome.'
  }
  return 'Não foi possível salvar o serviço agora. Tente novamente.'
}

export function useServicoMutations() {
  const queryClient = useQueryClient()

  const createServico = useMutation({
    mutationFn: async (input: ServicoFormInput) => {
      if (isDemoAtivo(queryClient)) {
        const servico: Servico = { id: novoIdDemo(), ...input, created_at: agoraIso() }
        queryClient.setQueryData<Servico[]>(['servicos', true], (old) => [servico, ...(old ?? [])])
        if (servico.ativo) {
          queryClient.setQueryData<Servico[]>(['servicos', false], (old) => [servico, ...(old ?? [])])
        }
        return servico
      }
      const { data, error } = await supabase.from('servicos').insert(input).select().single()
      if (error) throw new Error(traduzErroSalvar(error.message))
      return data as Servico
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['servicos'])
    },
  })

  const updateServico = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ServicoFormInput }) => {
      if (isDemoAtivo(queryClient)) {
        for (const key of [['servicos', true], ['servicos', false]] as const) {
          queryClient.setQueryData<Servico[]>(key, (old) => (old ?? []).map((s) => (s.id === id ? { ...s, ...input } : s)))
        }
        if (!input.ativo) {
          queryClient.setQueryData<Servico[]>(['servicos', false], (old) => (old ?? []).filter((s) => s.id !== id))
        }
        return
      }
      const { error } = await supabase.from('servicos').update(input).eq('id', id)
      if (error) throw new Error(traduzErroSalvar(error.message))
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['servicos'])
    },
  })

  return { createServico, updateServico }
}
