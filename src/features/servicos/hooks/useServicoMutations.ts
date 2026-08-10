import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
      const { data, error } = await supabase.from('servicos').insert(input).select().single()
      if (error) throw new Error(traduzErroSalvar(error.message))
      return data as Servico
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
    },
  })

  const updateServico = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ServicoFormInput }) => {
      const { error } = await supabase.from('servicos').update(input).eq('id', id)
      if (error) throw new Error(traduzErroSalvar(error.message))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
    },
  })

  return { createServico, updateServico }
}
