import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EmpresaConfig {
  id: string
  nome_fantasia: string
  razao_social: string | null
  documento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  logo_url: string | null
  mostrar_endereco: boolean
  mostrar_telefone: boolean
  mostrar_email: boolean
  mostrar_logo: boolean
  onboarding_concluido: boolean
  /** Tenant de demonstração (migration 0011) — ver `src/lib/demoMode.ts`. */
  is_demo: boolean
}

/**
 * Dados do cliente (empresa/tenant) do usuário logado, usados nos cabeçalhos
 * de PDF e na tela de Configurações — sem filtro explícito porque a RLS já
 * devolve só a linha da própria empresa (ver docs/database-schema.md § Multi-tenant).
 */
export function useEmpresaConfig(enabled = true) {
  return useQuery({
    queryKey: ['empresa_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('*').single()
      if (error) throw error
      return data as EmpresaConfig
    },
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Atalho pra saber se o usuário logado está na empresa Demonstração — ver `src/lib/demoMode.ts`. */
export function useIsDemo(enabled = true): boolean {
  const { data } = useEmpresaConfig(enabled)
  return Boolean(data?.is_demo)
}
