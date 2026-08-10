import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import type { RoleUsuario } from '@/types/domain'

export interface Profile {
  id: string
  nome: string | null
  role: RoleUsuario
  ativo: boolean
}

/**
 * Perfil interno (role, nome) do usuário logado — usado para liberar/esconder
 * ações restritas a admin (ex.: editar tabela de preços/comissões, ver
 * `docs/database-schema.md` § RLS).
 */
export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data as Profile
    },
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  })
}
