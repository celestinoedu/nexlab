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
type ModoEntrada = 'valor' | 'percentual'

export function TabelaPrecosDialog({ open, onOpenChange, entidade }: TabelaPrecosDialogProps) {
  const { data: servicos, isLoading: carregandoServicos } = useServicos()
  const { data: precosAtuais, isLoading: carregandoPrecos } = useTabelaPrecos(entidade?.id ?? null)
  const { data: profile } = useProfile()
  const { salvar } = useTabelaPrecosMutations(entidade?.id ?? '')

  const [valores, setValores] = React.useState<Record<string, string>>({})
  const [modos, setModos] = React.useState<Record<string, ModoEntrada>>({})
  const ehParceiro = entidade?.tipo === 'parceiro'
  const podeEditar = profile?.role === 'admin'

  React.useEffect(() => {
    if (!open || !precosAtuais) return
    const iniciais: Record<string, string> = {}
    for (const [servicoId, preco] of precosAtuais.entries()) {
      iniciais[servicoId] = String(preco)
    }
    setValores(iniciais)
    setModos({}) // sempre volta pro modo "R$" — o valor salvo é sempre o final, não dá pra saber se veio de % antes
  }, [open, precosAtuais])

  if (!entidade) return null

  const carregando = carregandoServicos || carregandoPrecos

  function alternarModo(servicoId: string, precoPadrao: number) {
    const modoAtual = modos[servicoId] ?? 'valor'
    const proximo: ModoEntrada = modoAtual === 'valor' ? 'percentual' : 'valor'
    const bruto = Number(valores[servicoId]?.replace(',', '.'))

    if (Number.isFinite(bruto) && precoPadrao > 0) {
      const convertido =
        proximo === 'percentual' ? (bruto / precoPadrao) * 100 : (precoPadrao * bruto) / 100
      setValores((prev) => ({ ...prev, [servicoId]: String(Math.round(convertido * 100) / 100) }))
    }
    setModos((prev) => ({ ...prev, [servicoId]: proximo }))
  }

  async function onSalvar() {
    const linhas = (servicos ?? []).map((s) => {
      const bruto = valores[s.id]?.trim().replace(',', '.')
      if (!bruto) return { servico_id: s.id, preco: null }
      const modo = modos[s.id] ?? 'valor'
      const numero = Number(bruto)
      const preco = modo === 'percentual' ? Math.round(((s.preco_padrao * numero) / 100) * 100) / 100 : numero
      return { servico_id: s.id, preco }
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
              ? 'Valor de comissão que este parceiro paga por serviço — digite em R$ ou toque no botão "%" pra calcular a partir do preço padrão do catálogo (o valor final em R$ é sempre o que fica salvo). Deixe em branco para usar o preço padrão como referência.'
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
            <div
              className={`grid ${ehParceiro ? 'grid-cols-[1fr_5.5rem_3rem]' : 'grid-cols-[1fr_7rem]'} gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400`}
            >
              <span>Serviço</span>
              <span className="text-right">{ehParceiro ? 'Comissão' : 'Preço (R$)'}</span>
              {ehParceiro && <span />}
            </div>
            {(servicos ?? []).map((servico) => {
              const modo = modos[servico.id] ?? 'valor'
              const bruto = Number(valores[servico.id]?.replace(',', '.'))
              return (
                <div
                  key={servico.id}
                  className={`grid ${ehParceiro ? 'grid-cols-[1fr_5.5rem_3rem]' : 'grid-cols-[1fr_7rem]'} items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-0`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-800">{servico.nome}</span>
                    <span className="text-xs text-slate-400">
                      Padrão: {servico.preco_padrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      disabled={!podeEditar}
                      placeholder="—"
                      value={valores[servico.id] ?? ''}
                      onChange={(e) => setValores((prev) => ({ ...prev, [servico.id]: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    {ehParceiro && modo === 'percentual' && Number.isFinite(bruto) && (
                      <span className="text-[11px] text-slate-400">
                        ≈{' '}
                        {((servico.preco_padrao * bruto) / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    )}
                  </div>
                  {ehParceiro && (
                    <button
                      type="button"
                      disabled={!podeEditar}
                      onClick={() => alternarModo(servico.id, servico.preco_padrao)}
                      title={modo === 'valor' ? 'Trocar para % do preço padrão' : 'Trocar para valor em R$'}
                      className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {modo === 'valor' ? 'R$' : '%'}
                    </button>
                  )}
                </div>
              )
            })}
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
