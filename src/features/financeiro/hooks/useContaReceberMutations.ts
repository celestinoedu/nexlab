import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, atualizarNoCache } from '@/lib/demoMode'
import type { ContaReceberComRelacoes, OrdemServicoComRelacoes, StatusPagamentoOS } from '@/types/domain'

function traduzErro(message: string): string {
  return message.toLowerCase().includes('row-level security')
    ? 'Somente administradores podem cancelar uma conta a receber.'
    : 'Não foi possível salvar agora. Tente novamente.'
}

function sincronizarOrdemDemo(
  queryClient: ReturnType<typeof useQueryClient>,
  contaId: string,
  statusPagamento: StatusPagamentoOS,
  dataPagamento: string | null,
  formaPagamento?: string | null,
) {
  const conta = queryClient
    .getQueryData<ContaReceberComRelacoes[]>(['contas_receber'])
    ?.find((item) => item.id === contaId)
  if (!conta) return

  queryClient.setQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'], (old) =>
    (old ?? []).map((ordem) =>
      ordem.id === conta.ordem_id
        ? {
            ...ordem,
            status_pagamento: statusPagamento,
            data_pagamento: dataPagamento,
            ...(formaPagamento !== undefined ? { forma_pagamento: formaPagamento } : {}),
          }
        : ordem,
    ),
  )
}

export function useContaReceberMutations() {
  const queryClient = useQueryClient()

  // Uma baixa/reabertura/cancelamento também muda o status de pagamento da
  // OS (trigger no banco): sem recarregar as OS, a lista mostrava a situação
  // antiga até o próximo refetch (achado F14).
  function invalidarDependentes() {
    invalidarSeReal(queryClient, ['contas_receber'])
    invalidarSeReal(queryClient, ['ordens_servico'])
  }

  const marcarComoPago = useMutation({
    mutationFn: async ({
      id,
      dataPagamento,
      formaPagamento,
    }: {
      id: string
      dataPagamento: string
      formaPagamento: string | null
    }) => {
      if (isDemoAtivo(queryClient)) {
        atualizarNoCache<ContaReceberComRelacoes>(queryClient, ['contas_receber'], id, {
          status: 'pago',
          data_pagamento: dataPagamento,
          forma_pagamento: formaPagamento,
        })
        sincronizarOrdemDemo(queryClient, id, 'pago', dataPagamento, formaPagamento)
        return
      }
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento })
        .eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarDependentes()
    },
  })

  const marcarComoPendente = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoAtivo(queryClient)) {
        atualizarNoCache<ContaReceberComRelacoes>(queryClient, ['contas_receber'], id, {
          status: 'aberto',
          data_pagamento: null,
        })
        sincronizarOrdemDemo(queryClient, id, 'pendente', null)
        return
      }
      const { error } = await supabase.from('contas_receber').update({ status: 'aberto', data_pagamento: null }).eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarDependentes()
    },
  })

  /** Marca várias contas de uma vez como pagas — mesma data/forma pra todas. */
  const marcarVariasComoPago = useMutation({
    mutationFn: async ({
      ids,
      dataPagamento,
      formaPagamento,
    }: {
      ids: string[]
      dataPagamento: string
      formaPagamento: string | null
    }) => {
      if (isDemoAtivo(queryClient)) {
        queryClient.setQueryData<ContaReceberComRelacoes[]>(['contas_receber'], (old) =>
          (old ?? []).map((c) =>
            ids.includes(c.id) ? { ...c, status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento } : c,
          ),
        )
        for (const id of ids) sincronizarOrdemDemo(queryClient, id, 'pago', dataPagamento, formaPagamento)
        return
      }
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento })
        .in('id', ids)
        // Só contas ainda abertas: uma conta paga ou cancelada por outra pessoa
        // enquanto a tela estava aberta não é sobrescrita (achado F13).
        .eq('status', 'aberto')
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarDependentes()
    },
  })

  /** "Exclusão" é sempre soft-delete com justificativa — só admin (ver RLS). */
  const cancelar = useMutation({
    mutationFn: async ({ id, justificativa }: { id: string; justificativa: string }) => {
      if (isDemoAtivo(queryClient)) {
        atualizarNoCache<ContaReceberComRelacoes>(queryClient, ['contas_receber'], id, {
          status: 'cancelado',
          justificativa_cancelamento: justificativa,
        })
        return
      }
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'cancelado', justificativa_cancelamento: justificativa })
        .eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarDependentes()
    },
  })

  return { marcarComoPago, marcarComoPendente, marcarVariasComoPago, cancelar }
}
