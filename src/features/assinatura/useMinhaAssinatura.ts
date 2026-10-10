import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MinhaAssinatura {
  valor_mensal: number
  proximo_vencimento: string
  dias_aviso: number
  ativa: boolean
}

/**
 * Mensalidade da empresa do usuário logado (tabela `assinaturas`, migration
 * 0025). A RLS devolve só a linha da própria empresa; sem linha = sem cobrança
 * configurada, e nenhum aviso aparece.
 */
export function useMinhaAssinatura(enabled = true) {
  return useQuery({
    queryKey: ['minha_assinatura'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('valor_mensal, proximo_vencimento, dias_aviso, ativa')
        .maybeSingle()
      if (error) throw error
      return data ? ({ ...data, valor_mensal: Number(data.valor_mensal) } as MinhaAssinatura) : null
    },
    enabled,
    staleTime: 5 * 60_000,
    // Uma baixa feita no painel some da tela do cliente sem precisar recarregar.
    refetchInterval: 15 * 60_000,
    retry: 1,
  })
}
