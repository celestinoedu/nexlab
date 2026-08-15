import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, atualizarNoCache } from '@/lib/demoMode'
import type { ContaReceberComRelacoes } from '@/types/domain'

function traduzErro(message: string): string {
  return message.toLowerCase().includes('row-level security')
    ? 'Somente administradores podem cancelar uma conta a receber.'
    : 'Não foi possível salvar agora. Tente novamente.'
}

export function useContaReceberMutations() {
  const queryClient = useQueryClient()

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
        return
      }
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento })
        .eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['contas_receber'])
    },
  })

  const marcarComoPendente = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoAtivo(queryClient)) {
        atualizarNoCache<ContaReceberComRelacoes>(queryClient, ['contas_receber'], id, {
          status: 'aberto',
          data_pagamento: null,
        })
        return
      }
      const { error } = await supabase.from('contas_receber').update({ status: 'aberto', data_pagamento: null }).eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['contas_receber'])
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
        return
      }
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento })
        .in('id', ids)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['contas_receber'])
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
      invalidarSeReal(queryClient, ['contas_receber'])
    },
  })

  return { marcarComoPago, marcarComoPendente, marcarVariasComoPago, cancelar }
}
