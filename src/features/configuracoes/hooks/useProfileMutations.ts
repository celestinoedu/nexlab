import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { ERRO_INDISPONIVEL_DEMO, isDemoAtivo } from '@/lib/demoMode'

export function useProfileMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const salvarPerfil = useMutation({
    mutationFn: async ({ nome, documentoFiscal }: { nome: string; documentoFiscal: string }) => {
      if (isDemoAtivo(queryClient)) throw new Error(ERRO_INDISPONIVEL_DEMO)
      const { error } = await supabase.rpc('update_my_profile', {
        p_nome: nome.trim(),
        p_documento_fiscal: documentoFiscal,
      })
      if (error) throw new Error('Não foi possível salvar seu perfil agora. Tente novamente.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  })

  return { salvarPerfil }
}
