import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { LOTUS_EMAIL_SUPORTE } from '@/lib/appInfo'
import { useMinhaAssinatura } from './useMinhaAssinatura'
import { calcularBloqueio, calcularSituacao, descreverPrazo, diasAte, formatarData, formatarMoeda, hojeLocal, parcelasEmAberto } from './situacao'

/**
 * Aviso de mensalidade perto do vencimento ou em atraso: pop-up uma vez por
 * dia e tarja fixa no rodapé enquanto a situação durar. Some sozinho quando a
 * Lotus registra o pagamento no painel (/#/admin).
 */
export function AvisoAssinatura() {
  const navigate = useNavigate()
  const { data: empresa } = useEmpresaConfig()
  const { data: assinatura } = useMinhaAssinatura(Boolean(empresa && !empresa.is_demo))
  const hoje = hojeLocal()
  const situacao = calcularSituacao(assinatura, hoje)
  // Com débito automático ativo, só o atraso (ex.: cartão recusado) merece aviso.
  const debitoAtivo = assinatura?.mp_preapproval_status === 'authorized'
  const bloqueio = calcularBloqueio(assinatura, hoje)
  const exibir = Boolean(assinatura) && !bloqueio.bloqueada && (situacao === 'atrasada' || (situacao === 'vence_em_breve' && !debitoAtivo))
  const chave = empresa ? `nexlab:aviso-assinatura:${empresa.id}` : ''
  const marca = assinatura ? `${hoje}|${assinatura.proximo_vencimento}` : ''
  const [fechadoEm, setFechadoEm] = React.useState<string | null>(null)

  if (!exibir || !assinatura) return null

  const popupAberto = fechadoEm !== marca && lerArmazenado(chave) !== marca

  const atrasada = situacao === 'atrasada'
  const dias = diasAte(assinatura.proximo_vencimento, hoje)
  const vencimento = formatarData(assinatura.proximo_vencimento)
  const valor = formatarMoeda(assinatura.valor_mensal)
  const vencidas = parcelasEmAberto(assinatura, hoje).filter((parcela) => parcela.atrasada).length
  const avisoBloqueio = bloqueio.diasParaBloquear === null || !bloqueio.bloqueiaEm
    ? ''
    : bloqueio.diasParaBloquear === 1
      ? `O acesso ao NexLab será bloqueado amanhã (${formatarData(bloqueio.bloqueiaEm)}).`
      : `O acesso ao NexLab será bloqueado em ${bloqueio.diasParaBloquear} dias (${formatarData(bloqueio.bloqueiaEm)}).`
  const bloqueioCurto = bloqueio.diasParaBloquear === null ? '' : bloqueio.diasParaBloquear === 1 ? 'acesso bloqueado amanhã' : `acesso bloqueado em ${bloqueio.diasParaBloquear} dias`

  function fecharPopup() {
    gravarArmazenado(chave, marca)
    setFechadoEm(marca)
  }

  return (
    <>
      <div
        role="status"
        className={cn(
          'flex items-center gap-3 border-t px-4 py-2.5 text-sm md:px-7',
          atrasada ? 'border-danger-700 bg-danger-500 text-white' : 'border-warning-500/40 bg-warning-100 text-warning-700',
        )}
      >
        <AlertTriangle size={17} className="shrink-0" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">{atrasada ? 'Mensalidade em atraso' : `Mensalidade ${descreverPrazo(dias)}`}</span>
          <span> · {atrasada ? `venceu em ${vencimento}` : `${valor} em ${vencimento}`}</span>
          {atrasada && bloqueioCurto && <span className="font-semibold"> · {bloqueioCurto}</span>}
          <span className="hidden sm:inline">
            {atrasada ? '. Pague com Pix ou cartão para confirmar na hora.' : '.'}
          </span>
        </p>
        <Link to="/meu-perfil" className="shrink-0 font-semibold underline underline-offset-2">
          Pagar agora
        </Link>
      </div>

      <Dialog open={popupAberto} onOpenChange={(aberto) => !aberto && fecharPopup()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div
              className={cn(
                'mb-2 flex size-11 items-center justify-center rounded-xl',
                atrasada ? 'bg-danger-100 text-danger-500' : 'bg-warning-100 text-warning-700',
              )}
            >
              {atrasada ? <AlertTriangle size={22} /> : <CalendarClock size={22} />}
            </div>
            <DialogTitle>{atrasada ? 'Mensalidade em atraso' : `Sua mensalidade ${descreverPrazo(dias)}`}</DialogTitle>
            <DialogDescription>
              {atrasada && vencidas > 1
                ? `Há ${vencidas} mensalidades do NexLab em aberto, somando ${formatarMoeda(vencidas * assinatura.valor_mensal)}. A mais antiga ${descreverPrazo(dias)} (${vencimento}). ${avisoBloqueio} Pague com Pix ou cartão para a confirmação ser imediata.`
                : atrasada
                ? `A mensalidade do NexLab de ${valor} ${descreverPrazo(dias)} (${vencimento}). ${avisoBloqueio} Pague com Pix ou cartão para a confirmação ser imediata.`
                : `O pagamento de ${valor} do NexLab vence em ${vencimento}. Mantenha em dia para continuar usando o sistema sem interrupções.`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Pagou pelo Mercado Pago? A confirmação é automática e este aviso some sozinho. Dúvidas: <span className="font-medium text-slate-700">{LOTUS_EMAIL_SUPORTE}</span>
          </p>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={fecharPopup}>
              Entendi
            </Button>
            <Button type="button" onClick={() => { fecharPopup(); navigate('/meu-perfil') }}>Pagar agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Guarda só "já vi hoje" — se o navegador bloquear o armazenamento, o pop-up
// apenas volta a aparecer; a tarja não depende disso.
function lerArmazenado(chave: string) {
  try { return window.localStorage.getItem(chave) } catch { return null }
}

function gravarArmazenado(chave: string, valor: string) {
  try { window.localStorage.setItem(chave, valor) } catch { /* ignora */ }
}
