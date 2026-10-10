import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Uma empresa cliente com os dados da mensalidade (campos nulos = cobrança ainda não configurada). */
export interface AssinaturaAdmin {
  empresa_id: string
  nome_fantasia: string
  email: string | null
  telefone: string | null
  criada_em: string
  usuarios_ativos: number
  valor_mensal: number | null
  proximo_vencimento: string | null
  dia_vencimento: number | null
  dias_aviso: number | null
  ativa: boolean | null
  ultimo_pagamento: string | null
  /** Débito automático no Mercado Pago (pending, authorized, paused, cancelled) ou nulo. */
  debito_automatico: string | null
}

export interface PagamentoAdmin {
  id: string
  competencia: string
  valor: number
  data_vencimento: string
  data_pagamento: string
  origem: 'manual' | 'mercadopago'
  forma_pagamento: string | null
}

export interface SalvarAssinaturaInput {
  empresaId: string
  valorMensal: number
  proximoVencimento: string
  diasAviso: number
  ativa: boolean
}

export interface RegistrarPagamentoInput {
  empresaId: string
  valor: number
  dataPagamento: string
}

function erroAmigavel(error: { message?: string; code?: string }): Error {
  if (error.code === '42501') return new Error('Sua conta não tem acesso à administração do NexLab.')
  // Mensagens de `raise exception` das funções admin_* já vêm em português.
  if (error.code === 'P0001' && error.message) return new Error(error.message)
  return new Error('Não foi possível concluir agora. Tente novamente.')
}

export function useAdminAssinaturas(enabled = true) {
  return useQuery({
    queryKey: ['admin_assinaturas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_listar_assinaturas')
      if (error) throw erroAmigavel(error)
      return (data as AssinaturaAdmin[]).map((item) => ({
        ...item,
        usuarios_ativos: Number(item.usuarios_ativos),
        valor_mensal: item.valor_mensal === null ? null : Number(item.valor_mensal),
      }))
    },
    enabled,
  })
}

export function usePagamentosAdmin(empresaId: string | null) {
  return useQuery({
    queryKey: ['admin_pagamentos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_listar_pagamentos', { p_empresa_id: empresaId })
      if (error) throw erroAmigavel(error)
      return (data as PagamentoAdmin[]).map((item) => ({ ...item, valor: Number(item.valor) }))
    },
    enabled: Boolean(empresaId),
  })
}

export function useAdminAssinaturaMutations() {
  const queryClient = useQueryClient()

  function atualizarListas(empresaId: string) {
    void queryClient.invalidateQueries({ queryKey: ['admin_assinaturas'] })
    void queryClient.invalidateQueries({ queryKey: ['admin_pagamentos', empresaId] })
    // A conta da Lotus também pode ser usuária de um laboratório.
    void queryClient.invalidateQueries({ queryKey: ['minha_assinatura'] })
    void queryClient.invalidateQueries({ queryKey: ['faturas_assinatura'] })
  }

  const salvarAssinatura = useMutation({
    mutationFn: async (input: SalvarAssinaturaInput) => {
      const { error } = await supabase.rpc('admin_salvar_assinatura', {
        p_empresa_id: input.empresaId,
        p_valor_mensal: input.valorMensal,
        p_proximo_vencimento: input.proximoVencimento,
        p_dias_aviso: input.diasAviso,
        p_ativa: input.ativa,
      })
      if (error) throw erroAmigavel(error)
    },
    onSuccess: (_data, input) => atualizarListas(input.empresaId),
  })

  const registrarPagamento = useMutation({
    mutationFn: async (input: RegistrarPagamentoInput) => {
      const { data, error } = await supabase.rpc('admin_registrar_pagamento', {
        p_empresa_id: input.empresaId,
        p_valor: input.valor,
        p_data_pagamento: input.dataPagamento,
      })
      if (error) throw erroAmigavel(error)
      return data as string
    },
    onSuccess: (_data, input) => atualizarListas(input.empresaId),
  })

  const desfazerUltimoPagamento = useMutation({
    mutationFn: async (empresaId: string) => {
      const { data, error } = await supabase.rpc('admin_desfazer_ultimo_pagamento', { p_empresa_id: empresaId })
      if (error) throw erroAmigavel(error)
      return data as string
    },
    onSuccess: (_data, empresaId) => atualizarListas(empresaId),
  })

  return { salvarAssinatura, registrarPagamento, desfazerUltimoPagamento }
}
