import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/hooks/useProfile'

/**
 * Lista de usuários internos (`profiles`). RLS já cuida da visibilidade:
 * admin vê todos, um usuário comum só vê a si mesmo (ver
 * `docs/database-schema.md` § RLS) — não precisa filtrar nada no cliente.
 */
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('nome')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}
