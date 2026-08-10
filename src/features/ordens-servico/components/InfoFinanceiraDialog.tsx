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
import { cn } from '@/lib/utils'
import type { StatusPagamentoOS } from '@/types/domain'

interface InfoFinanceiraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statusPagamento: StatusPagamentoOS
  formaPagamento: string
  dataPagamento: string
  onSalvar: (dados: {
    status_pagamento: StatusPagamentoOS
    forma_pagamento: string
    data_pagamento: string
  }) => void
}

/**
 * Popup de "Informações financeiras" da OS (status financeiro, forma e data
 * de pagamento) — separado do corpo principal do formulário pra não poluir a
 * tela com um campo que a maioria das OS deixa no padrão (Pendente). Os
 * dados só entram no formulário da OS ao clicar "Salvar" aqui.
 */
export function InfoFinanceiraDialog({
  open,
  onOpenChange,
  statusPagamento,
  formaPagamento,
  dataPagamento,
  onSalvar,
}: InfoFinanceiraDialogProps) {
  const [status, setStatus] = React.useState<StatusPagamentoOS>('pendente')
  const [forma, setForma] = React.useState('')
  const [data, setData] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setStatus(statusPagamento)
    setForma(formaPagamento)
    setData(dataPagamento || format(new Date(), 'yyyy-MM-dd'))
  }, [open, statusPagamento, formaPagamento, dataPagamento])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Informações financeiras</DialogTitle>
          <DialogDescription>
            Status de pagamento desta OS. Uma OS entregue e paga já entra assim em Contas a Receber.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Status financeiro</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['pendente', 'pago'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setStatus(opcao)}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors',
                    status === opcao
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {opcao === 'pendente' ? 'Pendente' : 'Pago'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="forma_pagamento_os">Forma de pagamento (opcional)</Label>
            <Input
              id="forma_pagamento_os"
              placeholder="Ex.: Pix, Boleto, Transferência"
              value={forma}
              onChange={(e) => setForma(e.target.value)}
            />
          </div>

          {status === 'pago' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data_pagamento_os">Data de pagamento</Label>
              <Input id="data_pagamento_os" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSalvar({
                status_pagamento: status,
                forma_pagamento: forma.trim(),
                data_pagamento: status === 'pago' ? data : '',
              })
              onOpenChange(false)
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
