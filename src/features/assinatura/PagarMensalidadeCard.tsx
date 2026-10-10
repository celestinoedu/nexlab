import * as React from 'react'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LOTUS_EMAIL_SUPORTE } from '@/lib/appInfo'
import { cn } from '@/lib/utils'
import type { MinhaAssinatura } from './useMinhaAssinatura'
import { useMercadoPago } from './useMercadoPago'
import { ID_PAGAR_MENSALIDADE, descreverPrazo, diasAte, formatarData, formatarMoeda, hojeLocal, parcelasEmAberto } from './situacao'

/** Valor em aberto, botão de pagamento do Mercado Pago e débito automático, em Meu Perfil. */
export function PagarMensalidadeCard({ assinatura, podeGerenciarDebito }: { assinatura: MinhaAssinatura; podeGerenciarDebito: boolean }) {
  const mercadoPago = useMercadoPago()
  const [confirmandoCancelamento, setConfirmandoCancelamento] = React.useState(false)
  const hoje = hojeLocal()
  const parcelas = parcelasEmAberto(assinatura, hoje)
  if (!parcelas.length) return null

  const vencidas = parcelas.filter((parcela) => parcela.atrasada)
  const total = parcelas.length * assinatura.valor_mensal
  const primeira = parcelas[0]
  const debito = assinatura.mp_preapproval_status
  const debitoAtivo = debito === 'authorized'
  // Com débito automático em dia, pagar manualmente cobraria duas vezes.
  const mostrarPagar = !debitoAtivo || vencidas.length > 0

  async function executar(acao: 'pagar' | 'ativar_debito' | 'cancelar_debito') {
    try {
      await mercadoPago.mutateAsync(acao)
      if (acao === 'cancelar_debito') {
        setConfirmandoCancelamento(false)
        toast.success('Débito automático cancelado.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir agora.')
    }
  }
  const carregando = (acao: string) => mercadoPago.isPending && mercadoPago.variables === acao

  return (
    <Card id={ID_PAGAR_MENSALIDADE} className="scroll-mt-4">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ShieldCheck size={19} /></div>
          <div><h2 className="font-semibold text-slate-900">Mensalidade NexLab</h2><p className="text-sm text-slate-500">Pagamento seguro pelo Mercado Pago.</p></div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 pt-5 md:grid-cols-2">
        <div className={cn('flex flex-col justify-center rounded-2xl p-5', vencidas.length ? 'bg-danger-100/70 text-danger-700' : debitoAtivo ? 'bg-success-100/60 text-success-700' : 'bg-warning-100/60 text-warning-700')}>
          <p className="text-xs font-semibold tracking-[0.1em] uppercase">
            {vencidas.length ? 'Valor em aberto' : debitoAtivo ? 'Próxima cobrança automática' : 'Próxima fatura'}
          </p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{formatarMoeda(vencidas.length ? total : assinatura.valor_mensal)}</p>
          <p className="mt-2 text-sm">
            {parcelas.length > 1
              ? `${parcelas.length} mensalidades de ${formatarMoeda(assinatura.valor_mensal)} · a mais antiga venceu em ${formatarData(primeira.vencimento)}`
              : `Vencimento em ${formatarData(primeira.vencimento)} · ${descreverPrazo(diasAte(primeira.vencimento, hoje))}`}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3">
          {mostrarPagar ? (
            <>
              <Button size="lg" className="w-full" onClick={() => void executar('pagar')} disabled={mercadoPago.isPending}>
                {carregando('pagar') ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                Pagar {formatarMoeda(total)} agora
              </Button>
              <p className="text-center text-sm text-slate-500">Pix, cartão de crédito ou boleto. A confirmação aparece aqui automaticamente.</p>
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl bg-success-100/60 p-4 text-sm text-success-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p>Tudo certo. A mensalidade de {formatarData(primeira.vencimento)} será cobrada automaticamente no cartão.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
          <div className="flex items-start gap-3">
            <CreditCard size={18} className={cn('mt-0.5 shrink-0', debitoAtivo ? 'text-success-500' : 'text-slate-400')} />
            <div className="text-sm">
              <p className="font-medium text-slate-800">
                {debitoAtivo ? 'Débito automático ativo' : debito === 'pending' ? 'Débito automático aguardando o cartão' : 'Débito automático no cartão'}
              </p>
              <p className="text-slate-500">
                {debitoAtivo
                  ? 'As mensalidades são cobradas no cartão cadastrado no Mercado Pago, sem você precisar fazer nada.'
                  : debito === 'pending'
                    ? 'O cadastro do cartão não foi concluído. Continue de onde parou para ativar.'
                    : 'Cadastre o cartão uma vez e as próximas mensalidades são pagas sozinhas.'}
                {!podeGerenciarDebito && ' Somente o administrador da conta pode alterar.'}
              </p>
            </div>
          </div>
          {podeGerenciarDebito && (
            debitoAtivo ? (
              confirmandoCancelamento ? (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="destructive" onClick={() => void executar('cancelar_debito')} disabled={mercadoPago.isPending}>
                    {carregando('cancelar_debito') && <Loader2 className="animate-spin" />}Confirmar cancelamento
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmandoCancelamento(false)}>Voltar</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="shrink-0 text-slate-500" onClick={() => setConfirmandoCancelamento(true)}>Cancelar débito automático</Button>
              )
            ) : (
              <Button size="sm" variant="secondary" className="shrink-0" onClick={() => void executar('ativar_debito')} disabled={mercadoPago.isPending}>
                {carregando('ativar_debito') ? <Loader2 className="animate-spin" /> : debito === 'pending' ? <RefreshCw /> : <CreditCard />}
                {debito === 'pending' ? 'Continuar ativação' : 'Ativar débito automático'}
              </Button>
            )
          )}
        </div>

        <p className="text-xs text-slate-400 md:col-span-2">
          Dúvidas sobre a cobrança? Fale com a Lotus pelo e-mail{' '}
          <a href={`mailto:${LOTUS_EMAIL_SUPORTE}`} className="font-medium text-brand-700 underline underline-offset-2">{LOTUS_EMAIL_SUPORTE}</a>.
        </p>
      </CardContent>
    </Card>
  )
}
