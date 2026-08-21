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

interface EntregaConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (dataEntrega: string) => void
  referencia?: string
}

/** Confirma a data de entrega ao mover um card para a coluna "Entregue". */
export function EntregaConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  referencia,
}: EntregaConfirmDialogProps) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const [data, setData] = React.useState(hoje)

  React.useEffect(() => {
    if (open) setData(hoje)
  }, [open, hoje])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como entregue</DialogTitle>
          <DialogDescription>
            {referencia ? `${referencia} — c` : 'C'}onfirme a data de entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="data_entrega">Data de entrega</Label>
          <Input
            id="data_entrega"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onConfirm(data)}>
            Confirmar entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
