import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useServicos } from '@/hooks/useServicos'
import { useTabelaPrecos } from '@/hooks/useTabelaPrecos'
import { useProfile } from '@/hooks/useProfile'
import { useTabelaPrecosMutations } from '../hooks/useTabelaPrecosMutations'
import type { Entidade } from '@/types/domain'

interface TabelaPrecosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entidade: Entidade | null
}

/**
 * Preço (Cliente) ou comissão (Parceiro) específico por serviço — escrita
 * restrita a admin (ver docs/database-schema.md § RLS). Quando o campo fica
 * em branco, a OS volta a usar o preço padrão do catálogo para esse serviço.
 */
export function TabelaPrecosDialog({ open, onOpenChange, entidade }: TabelaPrecosDialogProps) {
  const { data: servicos, isLoading: carregandoServicos } = useServicos()
  const { data: precosAtuais, isLoading: carregandoPrecos } = useTabelaPrecos(entidade?.id ?? null)
  const { data: profile } = useProfile()
  const { salvar } = useTabelaPrecosMutations(entidade?.id ?? '')

  const [valores, setValores] = React.useState<Record<string, string>>({})
  const ehParceiro = entidade?.tipo === 'parceiro'
  const podeEditar = profile?.role === 'admin'

  React.useEffect(() => {
    if (!open || !precosAtuais) return
    const iniciais: Record<string, string> = {}
    for (const [servicoId, preco] of precosAtuais.entries()) {
      iniciais[servicoId] = String(preco)
    }
    setValores(iniciais)
  }, [open, precosAtuais])

  if (!entidade) return null

  const carregando = carregandoServicos || carregandoPrecos

  async function onSalvar() {
    const linhas = (servicos ?? []).map((s) => {
      const bruto = valores[s.id]?.trim()
      return { servico_id: s.id, preco: bruto ? Number(bruto) : null }
    })
    try {
      await salvar.mutateAsync(linhas)
      toast.success('Tabela de preços salva.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tabela de preços — {entidade.nome}</DialogTitle>
          <DialogDescription>
            {ehParceiro
              ? 'Valor de comissão que este parceiro paga por serviço. Deixe em branco para usar o preço padrão do catálogo como referência.'
              : 'Preço específico deste cliente por serviço. Deixe em branco para usar o preço padrão do catálogo.'}
          </DialogDescription>
        </DialogHeader>

        {!podeEditar && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-100 px-3 py-2 text-sm text-warning-700">
            <Lock size={15} className="shrink-0" />
            Somente administradores podem editar preços e comissões. Você pode consultar os valores abaixo.
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-brand-600" size={24} />
          </div>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_7rem] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">
              <span>Serviço</span>
              <span className="text-right">{ehParceiro ? 'Comissão (R$)' : 'Preço (R$)'}</span>
            </div>
            {(servicos ?? []).map((servico) => (
              <div
                key={servico.id}
                className="grid grid-cols-[1fr_7rem] items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-slate-800">{servico.nome}</span>
                  <span className="text-xs text-slate-400">
                    Padrão: {servico.preco_padrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  disabled={!podeEditar}
                  placeholder="—"
                  value={valores[servico.id] ?? ''}
                  onChange={(e) => setValores((prev) => ({ ...prev, [servico.id]: e.target.value }))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {podeEditar ? 'Cancelar' : 'Fechar'}
          </Button>
          {podeEditar && (
            <Button type="button" onClick={onSalvar} disabled={salvar.isPending || carregando}>
              {salvar.isPending && <Loader2 className="animate-spin" size={16} />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
