import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { ERRO_INDISPONIVEL_DEMO, isDemoAtivo } from '@/lib/demoMode'

export function useProfileMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const salvarNome = useMutation({
    mutationFn: async (nome: string) => {
      if (isDemoAtivo(queryClient)) throw new Error(ERRO_INDISPONIVEL_DEMO)
      const { error } = await supabase.rpc('update_my_profile_name', { p_nome: nome.trim() })
      if (error) throw new Error('Não foi possível salvar seu perfil agora. Tente novamente.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  })

  return { salvarNome }
}
