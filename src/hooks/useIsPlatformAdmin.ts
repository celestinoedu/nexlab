import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

/**
 * Diz se a conta logada é da Lotus (tabela `platform_admins`, migration 0025).
 * Só decide o que mostrar na tela — quem protege os dados são as funções
 * `admin_*` no banco, que repetem a checagem a cada chamada.
 */
export function useIsPlatformAdmin() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['is_platform_admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_platform_admin')
      if (error) return false
      return data === true
    },
    enabled: Boolean(user?.id),
    staleTime: 30 * 60_000,
  })
}
