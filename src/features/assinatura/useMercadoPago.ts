import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type Acao = 'pagar' | 'ativar_debito' | 'cancelar_debito'

/**
 * Chama a Edge Function `mercadopago-pagamento`. "pagar" e "ativar_debito"
 * devolvem a URL do Mercado Pago e levam o usuário para lá; a baixa só
 * acontece quando o webhook confirma o pagamento.
 */
export function useMercadoPago() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (acao: Acao) => {
      const { data, error } = await supabase.functions.invoke<{ url?: string; ok?: boolean }>('mercadopago-pagamento', { body: { acao } })
      if (error) {
        // A função responde { error } em português para erros esperados.
        const detalhe = await (error as { context?: Response }).context?.json?.().catch(() => null)
        throw new Error(detalhe?.error ?? 'Não foi possível abrir o Mercado Pago agora. Tente novamente.')
      }
      return data
    },
    onSuccess: (data) => {
      if (data?.url) window.location.assign(data.url)
      else void queryClient.invalidateQueries({ queryKey: ['minha_assinatura'] })
    },
  })
}
