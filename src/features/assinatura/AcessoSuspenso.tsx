import { Lock } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import type { MinhaAssinatura } from './useMinhaAssinatura'
import { PagarMensalidadeCard } from './PagarMensalidadeCard'
import { diasAte, formatarData } from './situacao'

/**
 * Exibida no lugar de qualquer tela quando a empresa está bloqueada por
 * atraso (regra `public.empresa_bloqueada`, migration 0027). O banco já
 * recusa os dados operacionais; esta tela explica o motivo e leva ao pagamento.
 */
export function AcessoSuspenso({ assinatura }: { assinatura: MinhaAssinatura }) {
  const { data: profile } = useProfile()
  const atraso = -diasAte(assinatura.proximo_vencimento)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger-500/30 bg-white p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-danger-100 text-danger-500"><Lock size={22} /></span>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Acesso suspenso por falta de pagamento</h1>
          <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
            A mensalidade do NexLab venceu em {formatarData(assinatura.proximo_vencimento)} ({atraso} dias de atraso). Seus dados estão guardados
            em segurança. Assim que o pagamento for confirmado, o acesso volta na hora — com Pix ou cartão, em poucos segundos.
          </p>
        </div>
      </div>
      <PagarMensalidadeCard assinatura={assinatura} podeGerenciarDebito={profile?.role === 'admin'} />
    </div>
  )
}
