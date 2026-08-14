import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Despesa } from '@/types/domain'

interface ExcluirDespesaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  despesa: Despesa | null
  onConfirm: () => void
  excluindo?: boolean
}

/** Exclusão definitiva (sem soft-delete) — restrita a admin, sempre com confirmação explícita. */
export function ExcluirDespesaDialog({
  open,
  onOpenChange,
  despesa,
  onConfirm,
  excluindo,
}: ExcluirDespesaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir despesa</DialogTitle>
          <DialogDescription>
            {despesa
              ? `Tem certeza que quer excluir "${despesa.descricao}" (${despesa.valor.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })})? Essa ação não pode ser desfeita.`
              : 'Essa ação não pode ser desfeita.'}
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
