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

interface MarcarVariasPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quantidade: number
  onConfirm: (dataPagamento: string, formaPagamento: string | null) => void
}

/**
 * Marca várias contas a receber como pagas de uma vez — pensado pra Cliente
 * ou Parceiro que paga tudo de um período junto, não OS por OS (filtrar por
 * entidade + mês na tela e marcar tudo de uma vez).
 */
export function MarcarVariasPagoDialog({
  open,
  onOpenChange,
  quantidade,
  onConfirm,
}: MarcarVariasPagoDialogProps) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const [data, setData] = React.useState(hoje)
  const [forma, setForma] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setData(hoje)
      setForma('')
    }
  }, [open, hoje])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como pago em massa</DialogTitle>
          <DialogDescription>
            {quantidade} conta{quantidade === 1 ? '' : 's'} selecionada{quantidade === 1 ? '' : 's'} — mesma data e
            forma de pagamento pra todas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data_pagamento_massa">Data do pagamento</Label>
            <Input
              id="data_pagamento_massa"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="forma_pagamento_massa">Forma de pagamento (opcional)</Label>
            <Input
              id="forma_pagamento_massa"
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
            Marcar {quantidade} como paga{quantidade === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
