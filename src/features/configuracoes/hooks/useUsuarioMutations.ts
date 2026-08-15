import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RoleUsuario } from '@/types/domain'

export interface VincularUsuarioInput {
  id: string
  nome: string
  role: RoleUsuario
}

export interface AtualizarUsuarioInput {
  nome: string
  role: RoleUsuario
  ativo: boolean
}

function traduzErro(error: { code?: string; message: string }): string {
  if (error.code === '23503') {
    return 'Esse UUID não existe em Authentication → Users no Supabase. Confira se copiou certo.'
  }
  if (error.code === '23505') {
    return 'Já existe um usuário vinculado com esse UUID.'
  }
  return 'Não foi possível salvar agora. Tente novamente.'
}

export function useUsuarioMutations() {
  const queryClient = useQueryClient()

  const vincularUsuario = useMutation({
    mutationFn: async (input: VincularUsuarioInput) => {
      const { error } = await supabase.from('profiles').insert(input)
      if (error) throw new Error(traduzErro(error))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  const atualizarUsuario = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: AtualizarUsuarioInput }) => {
      const { error } = await supabase.from('profiles').update(input).eq('id', id)
      if (error) throw new Error(traduzErro(error))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  return { vincularUsuario, atualizarUsuario }
}
