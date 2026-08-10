import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ContaReceberComRelacoes } from '@/types/domain'

interface CancelarContaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conta: ContaReceberComRelacoes | null
  onConfirm: (justificativa: string) => void
}

/**
 * "Excluir" uma conta a receber é sempre soft-delete: exige justificativa, a
 * linha continua no banco com status "cancelado" e só reaparece se o usuário
 * filtrar por cancelados (ver docs/business-rules.md). Restrito a admin — o
 * botão que abre este modal já fica escondido para quem não é admin.
 */
export function CancelarContaDialog({ open, onOpenChange, conta, onConfirm }: CancelarContaDialogProps) {
  const [justificativa, setJustificativa] = React.useState('')

  React.useEffect(() => {
    if (open) setJustificativa('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar conta a receber</DialogTitle>
          <DialogDescription>
            {conta?.ordem.numero_os ? `OS #${conta.ordem.numero_os} — e` : 'E'}sta linha some da lista, mas fica
            registrada no histórico como cancelada. Explique o motivo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="justificativa">Justificativa</Label>
          <Textarea
            id="justificativa"
            rows={3}
            placeholder="Ex.: OS lançada em duplicidade, cobrança cancelada pelo cliente..."
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!justificativa.trim()}
            onClick={() => onConfirm(justificativa.trim())}
          >
            Cancelar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
