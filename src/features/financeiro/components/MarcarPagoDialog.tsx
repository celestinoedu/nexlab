import * as React from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ContaReceberComRelacoes } from '@/types/domain'

interface MarcarPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conta: ContaReceberComRelacoes | null
  onConfirm: (dataPagamento: string, formaPagamento: string | null) => void
}

/** Confirma data e forma de pagamento ao marcar uma conta a receber como paga. */
export function MarcarPagoDialog({ open, onOpenChange, conta, onConfirm }: MarcarPagoDialogProps) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const [data, setData] = React.useState(hoje)
  const [forma, setForma] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setData(hoje)
      setForma(conta?.forma_pagamento ?? '')
    }
  }, [open, hoje, conta])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
          <DialogDescription>
            {conta?.ordem.numero_os ? `OS #${conta.ordem.numero_os} — c` : 'C'}onfirme os dados do pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data_pagamento">Data do pagamento</Label>
            <Input
              id="data_pagamento"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="forma_pagamento_conta">Forma de pagamento (opcional)</Label>
            <Input
              id="forma_pagamento_conta"
              placeholder="Ex.: Pix, Boleto, Transferência"
              value={forma}
              onChange={(e) => setForma(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onConfirm(data, forma.trim() || null)}>
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
