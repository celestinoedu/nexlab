import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { referenciaOrdemExibicao, type OrdemServicoComRelacoes } from '@/types/domain'
import { useOrdemServicoMutations } from '../hooks/useOrdemServicoMutations'

interface ExcluirOrdemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ordem: OrdemServicoComRelacoes | null
  onDeleted: () => void
}

export function ExcluirOrdemDialog({ open, onOpenChange, ordem, onDeleted }: ExcluirOrdemDialogProps) {
  const { excluirOrdem } = useOrdemServicoMutations()
  const [motivo, setMotivo] = React.useState('')
  const [erro, setErro] = React.useState<string | null>(null)

  async function confirmar() {
    if (!ordem || !motivo.trim()) return
    setErro(null)
    try {
      await excluirOrdem.mutateAsync({ id: ordem.id, motivo: motivo.trim() })
      toast.success('OS excluída. O motivo ficou registrado no histórico.')
      onOpenChange(false)
      onDeleted()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível excluir a OS agora.')
    }
  }

  const referencia = ordem ? referenciaOrdemExibicao(ordem) : null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !excluirOrdem.isPending && onOpenChange(nextOpen)}>
      <DialogContent className="top-4 max-w-sm translate-y-0">
        <DialogHeader>
          <DialogTitle>Excluir OS</DialogTitle>
          <DialogDescription>
            {referencia ? `A OS (${referencia.rotulo} ${referencia.numero}) será marcada como cancelada.` : 'A OS será marcada como cancelada.'}
            {' '}Ela sairá dos totais e ficará no histórico com o motivo. Se houver uma cobrança aberta ou paga,
            cancele-a no Financeiro antes de confirmar aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="motivo_exclusao_os">Motivo da exclusão *</Label>
          <Textarea
            id="motivo_exclusao_os"
            rows={3}
            maxLength={500}
            placeholder="Ex.: OS lançada em duplicidade"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            disabled={excluirOrdem.isPending}
            aria-required="true"
          />
        </div>

        {erro && <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-700">{erro}</p>}

        <DialogFooter>
          <Button type="button" variant="secondary" disabled={excluirOrdem.isPending} onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" disabled={!motivo.trim() || excluirOrdem.isPending} onClick={confirmar}>
            {excluirOrdem.isPending && <Loader2 className="animate-spin" size={16} />}
            Confirmar exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
