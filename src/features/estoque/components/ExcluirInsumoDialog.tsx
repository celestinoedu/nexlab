import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Insumo } from '@/types/domain'

interface ExcluirInsumoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insumo: Insumo | null
  onConfirm: () => void
  excluindo?: boolean
}

/** Exclusão definitiva (sem soft-delete) — restrita a admin, sempre com confirmação explícita. */
export function ExcluirInsumoDialog({ open, onOpenChange, insumo, onConfirm, excluindo }: ExcluirInsumoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir insumo</DialogTitle>
          <DialogDescription>
            {insumo ? `Tem certeza que quer excluir "${insumo.nome}" do estoque? Essa ação não pode ser desfeita.` : 'Essa ação não pode ser desfeita.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={excluindo}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
