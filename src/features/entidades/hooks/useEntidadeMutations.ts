import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Entidade, TipoEntidade } from '@/types/domain'

export interface EntidadeFormInput {
  tipo: TipoEntidade
  nome: string
  documento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  observacoes: string | null
  ativo: boolean
}

function traduzErroSalvar(message: string): string {
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
    return 'Já existe um cadastro com esses dados.'
  }
  return 'Não foi possível salvar agora. Tente novamente.'
}

export function useEntidadeMutations() {
  const queryClient = useQueryClient()

  const createEntidade = useMutation({
    mutationFn: async (input: EntidadeFormInput) => {
      const { data, error } = await supabase.from('entidades').insert(input).select().single()
      if (error) throw new Error(traduzErroSalvar(error.message))
      return data as Entidade
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entidades'] })
    },
  })

  const updateEntidade = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EntidadeFormInput }) => {
      const { error } = await supabase.from('entidades').update(input).eq('id', id)
      if (error) throw new Error(traduzErroSalvar(error.message))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entidades'] })
    },
  })

  return { createEntidade, updateEntidade }
}
