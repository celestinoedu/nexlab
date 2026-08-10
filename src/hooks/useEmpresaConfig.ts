import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EmpresaConfig {
  id: number
  nome_fantasia: string
  razao_social: string | null
  documento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  logo_url: string | null
}

/** Dados do GRS Lab (singleton) usados nos cabeçalhos de PDF. */
export function useEmpresaConfig() {
  return useQuery({
    queryKey: ['empresa_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresa_config').select('*').eq('id', 1).single()
      if (error) throw error
      return data as EmpresaConfig
    },
    staleTime: 5 * 60_000,
  })
}
