import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Despesa } from '@/types/domain'

/**
 * Completa os campos da migration 0029 com os mesmos padrões do banco, para
 * a tela nunca quebrar com um registro sem tipo/status (ex.: banco ainda sem
 * a migration, ou cache antigo do PWA).
 */
function normalizarDespesa(row: Partial<Despesa> & Pick<Despesa, 'id' | 'descricao' | 'valor' | 'data_despesa'>): Despesa {
  return {
    categoria: null,
    observacoes: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    ...row,
    valor: Number(row.valor),
    tipo: row.tipo === 'fixa' ? 'fixa' : 'variavel',
    status: row.status === 'pendente' ? 'pendente' : 'pago',
    data_pagamento: row.data_pagamento ?? null,
  }
}

/** Lista todas as despesas, mais recentes primeiro. Filtros são aplicados no cliente pela tela. */
export function useDespesas() {
  return useQuery({
    queryKey: ['despesas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .order('data_despesa', { ascending: false })

      if (error) throw error
      return (data ?? []).map(normalizarDespesa)
    },
  })
}
