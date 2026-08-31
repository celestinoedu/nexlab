import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, ERRO_INDISPONIVEL_DEMO } from '@/lib/demoMode'
import type { RoleUsuario } from '@/types/domain'

export interface ConvidarUsuarioInput {
  email: string
  nome: string
  role: RoleUsuario
}

export interface AtualizarUsuarioInput {
  nome: string
  role: RoleUsuario
  ativo: boolean
}

function traduzErro(): string {
  return 'Não foi possível salvar agora. Tente novamente.'
}

function traduzErroConvite(error: { message: string }): string {
  const message = error.message.toLowerCase()
  if (message.includes('already') || message.includes('cadastrado')) {
    return 'Este e-mail já está cadastrado. Confira a lista de usuários.'
  }
  if (message.includes('edge function') || message.includes('failed to send')) {
    return 'O serviço de convites ainda não está disponível. Confira a publicação da função no Supabase.'
  }
  return error.message || 'Não foi possível enviar o convite agora. Tente novamente.'
}

export function useUsuarioMutations() {
  const queryClient = useQueryClient()

  const convidarUsuario = useMutation({
    mutationFn: async (input: ConvidarUsuarioInput) => {
      if (isDemoAtivo(queryClient)) throw new Error(ERRO_INDISPONIVEL_DEMO)
      const { data, error } = await supabase.functions.invoke('invite-user', { body: input })
      if (error) throw new Error(traduzErroConvite(error))
      if (data?.error) throw new Error(traduzErroConvite({ message: data.error }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  const atualizarUsuario = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: AtualizarUsuarioInput }) => {
      if (isDemoAtivo(queryClient)) throw new Error(ERRO_INDISPONIVEL_DEMO)
      const { error } = await supabase.from('profiles').update(input).eq('id', id)
      if (error) throw new Error(traduzErro())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  return { convidarUsuario, atualizarUsuario }
}
