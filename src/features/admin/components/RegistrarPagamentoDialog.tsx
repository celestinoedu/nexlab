import * as React from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatarCompetencia, formatarData, hojeLocal, proximoVencimentoApos } from '@/features/assinatura/situacao'
import { useAdminAssinaturaMutations, type AssinaturaAdmin } from '../hooks/useAdminAssinaturas'

interface RegistrarPagamentoDialogProps {
  item: AssinaturaAdmin | null
  onOpenChange: (open: boolean) => void
}

/** Dá baixa no vencimento atual e avança a assinatura para o mês seguinte. */
export function RegistrarPagamentoDialog({ item, onOpenChange }: RegistrarPagamentoDialogProps) {
  const { registrarPagamento } = useAdminAssinaturaMutations()
  const [valor, setValor] = React.useState('')
  const [dataPagamento, setDataPagamento] = React.useState('')

  React.useEffect(() => {
    if (!item) return
    setValor(item.valor_mensal != null ? item.valor_mensal.toFixed(2) : '')
    setDataPagamento(hojeLocal())
  }, [item])

  const vencimento = item?.proximo_vencimento
  const proximo = vencimento && item?.dia_vencimento ? proximoVencimentoApos(vencimento, item.dia_vencimento) : null

  async function onConfirmar(event: React.FormEvent) {
    event.preventDefault()
    if (!item) return
    const valorNumero = Number(valor)
    if (valor === '' || !Number.isFinite(valorNumero) || valorNumero < 0) return toast.error('Informe o valor pago.')
    if (!dataPagamento) return toast.error('Informe a data do pagamento.')

    try {
      const novoVencimento = await registrarPagamento.mutateAsync({ empresaId: item.empresa_id, valor: valorNumero, dataPagamento })
      toast.success(`Pagamento registrado. Próximo vencimento: ${formatarData(novoVencimento)}.`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível registrar agora.')
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            {item?.nome_fantasia}
            {vencimento && <> · mensalidade de {formatarCompetencia(vencimento)} (vencimento {formatarData(vencimento)})</>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onConfirmar} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pagamento_valor">Valor pago (R$)</Label>
              <Input id="pagamento_valor" type="number" step="0.01" min="0" inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pagamento_data">Pago em</Label>
              <Input id="pagamento_data" type="date" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
            </div>
          </div>

          {vencimento && proximo && (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
              <span>Vencimento {formatarData(vencimento)}</span>
              <ArrowRight size={16} className="shrink-0" />
              <span className="font-semibold">{formatarData(proximo)}</span>
            </div>
          )}
          <p className="text-xs text-slate-400">O pagamento aparece no histórico do cliente em Meu Perfil e os avisos passam a considerar o novo vencimento.</p>

          <DialogFooter className="mt-0">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={registrarPagamento.isPending}>
              {registrarPagamento.isPending && <Loader2 className="animate-spin" />}Confirmar pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
