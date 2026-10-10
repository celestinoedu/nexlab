import * as React from 'react'
import { Loader2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatarCompetencia, formatarData, formatarMoeda } from '@/features/assinatura/situacao'
import { useAdminAssinaturaMutations, usePagamentosAdmin, type AssinaturaAdmin } from '../hooks/useAdminAssinaturas'

interface AssinaturaDialogProps {
  item: AssinaturaAdmin | null
  onOpenChange: (open: boolean) => void
}

/** Configura a mensalidade de uma empresa e mostra os pagamentos já registrados. */
export function AssinaturaDialog({ item, onOpenChange }: AssinaturaDialogProps) {
  const { salvarAssinatura, desfazerUltimoPagamento } = useAdminAssinaturaMutations()
  const configurada = item?.proximo_vencimento != null
  const { data: pagamentos, isLoading: carregandoPagamentos } = usePagamentosAdmin(configurada ? item!.empresa_id : null)
  const [valor, setValor] = React.useState('')
  const [vencimento, setVencimento] = React.useState('')
  const [diasAviso, setDiasAviso] = React.useState('5')
  const [ativa, setAtiva] = React.useState(true)
  const [confirmandoDesfazer, setConfirmandoDesfazer] = React.useState(false)

  React.useEffect(() => {
    if (!item) return
    setValor(item.valor_mensal != null ? item.valor_mensal.toFixed(2) : '')
    setVencimento(item.proximo_vencimento ?? '')
    setDiasAviso(String(item.dias_aviso ?? 5))
    setAtiva(item.ativa ?? true)
    setConfirmandoDesfazer(false)
  }, [item])

  async function onSalvar(event: React.FormEvent) {
    event.preventDefault()
    if (!item) return
    const valorNumero = Number(valor)
    const diasNumero = Number(diasAviso)
    if (valor === '' || !Number.isFinite(valorNumero) || valorNumero < 0) return toast.error('Informe o valor da mensalidade.')
    if (!vencimento) return toast.error('Informe o próximo vencimento.')
    if (!Number.isInteger(diasNumero) || diasNumero < 0 || diasNumero > 30) return toast.error('A antecedência do aviso deve ficar entre 0 e 30 dias.')

    try {
      await salvarAssinatura.mutateAsync({
        empresaId: item.empresa_id,
        valorMensal: valorNumero,
        proximoVencimento: vencimento,
        diasAviso: diasNumero,
        ativa,
      })
      toast.success('Assinatura salva.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar agora.')
    }
  }

  async function onDesfazer() {
    if (!item) return
    try {
      const vencimentoRestaurado = await desfazerUltimoPagamento.mutateAsync(item.empresa_id)
      setVencimento(vencimentoRestaurado)
      setConfirmandoDesfazer(false)
      toast.success(`Pagamento desfeito. Vencimento voltou para ${formatarData(vencimentoRestaurado)}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível desfazer agora.')
    }
  }

  const ultimoPagamento = pagamentos?.[0]

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{configurada ? 'Editar assinatura' : 'Configurar cobrança'}</DialogTitle>
          <DialogDescription>{item?.nome_fantasia}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSalvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assinatura_valor">Valor da mensalidade (R$)</Label>
            <Input id="assinatura_valor" type="number" step="0.01" min="0" inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="0,00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assinatura_vencimento">Próximo vencimento</Label>
            <Input id="assinatura_vencimento" type="date" value={vencimento} onChange={(event) => setVencimento(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="assinatura_aviso">Avisar o cliente com quantos dias de antecedência</Label>
            <Input id="assinatura_aviso" type="number" min="0" max="30" step="1" inputMode="numeric" value={diasAviso} onChange={(event) => setDiasAviso(event.target.value)} className="sm:w-32" />
            <p className="text-xs text-slate-400">O pop-up e a tarja aparecem a partir desse prazo e continuam enquanto houver atraso.</p>
          </div>
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-4 rounded border-slate-300" checked={ativa} onChange={(event) => setAtiva(event.target.checked)} />
            <span>
              <span className="block text-sm font-medium text-slate-700">Cobrança ativa</span>
              <span className="block text-xs text-slate-400">Desmarque para pausar os avisos (cortesia, piloto ou contrato encerrado).</span>
            </span>
          </label>

          {configurada && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-slate-700">Pagamentos registrados</p>
              {carregandoPagamentos ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-brand-600" size={18} /></div>
              ) : !pagamentos?.length ? (
                <p className="mt-1 text-sm text-slate-400">Nenhum pagamento registrado ainda.</p>
              ) : (
                <ul className="mt-2 flex max-h-48 flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {pagamentos.map((pagamento) => (
                    <li key={pagamento.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-700 first-letter:uppercase">{formatarCompetencia(pagamento.competencia)}</span>
                        <span className="block text-xs text-slate-400">Pago em {formatarData(pagamento.data_pagamento)}</span>
                      </span>
                      <span className="shrink-0 font-medium text-slate-700">{formatarMoeda(pagamento.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {ultimoPagamento && (
                confirmandoDesfazer ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl bg-danger-100/60 p-3 text-sm text-danger-700">
                    <p>Remover o pagamento de <span className="font-semibold">{formatarCompetencia(ultimoPagamento.competencia)}</span>? O vencimento volta para {formatarData(ultimoPagamento.data_vencimento)}.</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="destructive" onClick={onDesfazer} disabled={desfazerUltimoPagamento.isPending}>
                        {desfazerUltimoPagamento.isPending && <Loader2 className="animate-spin" />}Desfazer pagamento
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmandoDesfazer(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="ghost" className="mt-1 text-slate-500" onClick={() => setConfirmandoDesfazer(true)}>
                    <Undo2 />Desfazer último pagamento
                  </Button>
                )
              )}
            </div>
          )}

          <DialogFooter className="mt-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvarAssinatura.isPending}>
              {salvarAssinatura.isPending && <Loader2 className="animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
