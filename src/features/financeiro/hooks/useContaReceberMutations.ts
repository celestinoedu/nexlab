import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'pago', data_pagamento: dataPagamento, forma_pagamento: formaPagamento })
        .eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_receber'] })
    },
  })

  const marcarComoPendente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'aberto', data_pagamento: null })
        .eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_receber'] })
    },
  })

  /** "Exclusão" é sempre soft-delete com justificativa — só admin (ver RLS). */
  const cancelar = useMutation({
    mutationFn: async ({ id, justificativa }: { id: string; justificativa: string }) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'cancelado', justificativa_cancelamento: justificativa })
        .eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_receber'] })
    },
  })

  return { marcarComoPago, marcarComoPendente, cancelar }
}
