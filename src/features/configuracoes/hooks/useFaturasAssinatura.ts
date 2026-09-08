import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type StatusFatura = 'pendente' | 'paga' | 'vencida' | 'cancelada'

export interface FaturaAssinatura {
  id: string
  competencia: string
  valor: number
  status: StatusFatura
  data_vencimento: string
  data_pagamento: string | null
  nota_fiscal_numero: string | null
  nota_fiscal_url: string | null
}

export function useFaturasAssinatura() {
  return useQuery({
    queryKey: ['faturas_assinatura'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturas_assinatura')
        .select('id, competencia, valor, status, data_vencimento, data_pagamento, nota_fiscal_numero, nota_fiscal_url')
        .order('competencia', { ascending: false })
      if (error) throw error
      return data as FaturaAssinatura[]
    },
    staleTime: 5 * 60_000,
  })
}
