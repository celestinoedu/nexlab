import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Lock, Search, Download } from 'lucide-react'
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
import { baixarCsv, formatarNumeroCsv } from '@/lib/csv'
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

type ModoEntrada = 'valor' | 'percentual'

/**
 * Preço (Cliente) ou comissão (Parceiro) específico por serviço — escrita
 * restrita a admin (ver docs/database-schema.md § RLS). Quando o campo fica
 * em branco, a OS volta a usar o preço padrão do catálogo para esse serviço.
 *
 * Pra Parceiro, mostra também o "Preço do Parceiro" (o que ele mesmo cobra
 * por aquele serviço na tabela dele) — é só referência pra conferir se a
 * comissão está correta (o pagamento da comissão é baseado na tabela de
 * preço do Parceiro, não na do laboratório). Não entra em nenhum cálculo: OS e
 * Fechamento Financeiro continuam 100% baseados na comissão.
 */
export function TabelaPrecosDialog({ open, onOpenChange, entidade }: TabelaPrecosDialogProps) {
  const { data: servicos, isLoading: carregandoServicos } = useServicos()
  const { data: precosAtuais, isLoading: carregandoPrecos } = useTabelaPrecos(entidade?.id ?? null)
  const { data: profile } = useProfile()
  const { salvar } = useTabelaPrecosMutations(entidade?.id ?? '')

  const [valores, setValores] = React.useState<Record<string, string>>({})
  const [valoresParceiro, setValoresParceiro] = React.useState<Record<string, string>>({})
  const [modos, setModos] = React.useState<Record<string, ModoEntrada>>({})
  const [busca, setBusca] = React.useState('')
  const ehParceiro = entidade?.tipo === 'parceiro'
  const podeEditar = profile?.role === 'admin'

  const servicosFiltrados = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    if (!buscaLower) return servicos ?? []
    return (servicos ?? []).filter((s) => s.nome.toLowerCase().includes(buscaLower))
  }, [servicos, busca])

  React.useEffect(() => {
    if (!open || !precosAtuais) return
    const iniciais: Record<string, string> = {}
    const iniciaisParceiro: Record<string, string> = {}
    for (const [servicoId, info] of precosAtuais.entries()) {
      iniciais[servicoId] = String(info.preco)
      if (info.precoParceiro !== null) iniciaisParceiro[servicoId] = String(info.precoParceiro)
    }
    setValores(iniciais)
    setValoresParceiro(iniciaisParceiro)
    setModos({}) // sempre volta pro modo "R$" — o valor salvo é sempre o final, não dá pra saber se veio de % antes
    setBusca('')
  }, [open, precosAtuais])

  if (!entidade) return null

  const carregando = carregandoServicos || carregandoPrecos

  /** Referência pro cálculo de % → R$: preço do próprio parceiro se já preenchido, senão o preço padrão do catálogo. */
  function precoReferencia(servicoId: string, precoPadrao: number) {
    const doParceiro = Number(valoresParceiro[servicoId]?.replace(',', '.'))
    return Number.isFinite(doParceiro) && doParceiro > 0 ? doParceiro : precoPadrao
  }

  function alternarModo(servicoId: string, precoPadrao: number) {
    const modoAtual = modos[servicoId] ?? 'valor'
    const proximo: ModoEntrada = modoAtual === 'valor' ? 'percentual' : 'valor'
    const bruto = Number(valores[servicoId]?.replace(',', '.'))
    const referencia = precoReferencia(servicoId, precoPadrao)

    if (Number.isFinite(bruto) && referencia > 0) {
      const convertido = proximo === 'percentual' ? (bruto / referencia) * 100 : (referencia * bruto) / 100
      setValores((prev) => ({ ...prev, [servicoId]: String(Math.round(convertido * 100) / 100) }))
    }
    setModos((prev) => ({ ...prev, [servicoId]: proximo }))
  }

  async function onSalvar() {
    const linhas = (servicos ?? []).map((s) => {
      const bruto = valores[s.id]?.trim().replace(',', '.')
      const brutoParceiro = valoresParceiro[s.id]?.trim().replace(',', '.')
      const precoParceiro = ehParceiro && brutoParceiro ? Number(brutoParceiro) : null

      if (!bruto) return { servico_id: s.id, preco: null, preco_parceiro: null }

      const modo = modos[s.id] ?? 'valor'
      const numero = Number(bruto)
      const referencia = precoReferencia(s.id, s.preco_padrao)
      const preco = modo === 'percentual' ? Math.round(((referencia * numero) / 100) * 100) / 100 : numero
      return { servico_id: s.id, preco, preco_parceiro: precoParceiro }
    })
    try {
      await salvar.mutateAsync(linhas)
      toast.success('Tabela de preços salva.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  function baixarCsvTabela() {
    const cabecalho = ehParceiro
      ? ['Serviço', 'Preço padrão (catálogo)', 'Preço do Parceiro', 'Comissão']
      : ['Serviço', 'Preço padrão (catálogo)', 'Preço específico']
    const linhas: (string | number)[][] = [
      cabecalho,
      ...servicosFiltrados.map((s) => {
        const base = [s.nome, formatarNumeroCsv(s.preco_padrao)]
        if (ehParceiro) {
          const precoParceiro = valoresParceiro[s.id]?.trim()
          const comissao = valores[s.id]?.trim()
          return [
            ...base,
            precoParceiro ? formatarNumeroCsv(Number(precoParceiro.replace(',', '.'))) : '',
            comissao ? formatarNumeroCsv(Number(comissao.replace(',', '.'))) : '',
          ]
        }
        const preco = valores[s.id]?.trim()
        return [...base, preco ? formatarNumeroCsv(Number(preco.replace(',', '.'))) : '']
      }),
    ]
    baixarCsv(`tabela-precos-${(entidade?.nome ?? 'entidade').toLowerCase().replace(/\s+/g, '-')}.csv`, linhas)
  }

  const gridCols = ehParceiro ? 'grid-cols-[1fr_9rem_9rem_3rem]' : 'grid-cols-[1fr_7rem]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-[70vw]">
        <DialogHeader>
          <DialogTitle>Tabela de preços — {entidade.nome}</DialogTitle>
          <DialogDescription>
            {ehParceiro
              ? 'Preço do Parceiro é o que ele mesmo cobra por esse serviço (só referência, pra conferir a comissão — não entra em nenhum cálculo). Comissão é o valor que o laboratório recebe: digite em R$ ou toque em "%" pra calcular a partir do Preço do Parceiro (ou do preço padrão do catálogo, se ainda não preencheu). Deixe a comissão em branco pra não cadastrar preço específico.'
              : 'Preço específico deste cliente por serviço. Deixe em branco para usar o preço padrão do catálogo.'}
          </DialogDescription>
        </DialogHeader>

        {!podeEditar && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-100 px-3 py-2 text-sm text-warning-700">
            <Lock size={15} className="shrink-0" />
            Somente administradores podem editar preços e comissões. Você pode consultar os valores abaixo.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar serviço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={baixarCsvTabela}
            disabled={carregando || servicosFiltrados.length === 0}
          >
            <Download size={15} />
            Baixar CSV
          </Button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-brand-600" size={24} />
          </div>
        ) : (
          <div className="flex max-h-[65vh] flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200">
            <div
              className={`grid ${gridCols} gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400`}
            >
              <span>Serviço</span>
              {ehParceiro ? (
                <>
                  <span className="text-right">Preço do Parceiro</span>
                  <span className="text-right">Comissão</span>
                  <span />
                </>
              ) : (
                <span className="text-right">Preço (R$)</span>
              )}
            </div>
            {servicosFiltrados.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                Nenhum serviço encontrado para "{busca}".
              </div>
            )}
            {servicosFiltrados.map((servico) => {
              const modo = modos[servico.id] ?? 'valor'
              const bruto = Number(valores[servico.id]?.replace(',', '.'))
              return (
                <div key={servico.id} className={`grid ${gridCols} items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-0`}>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-800">{servico.nome}</span>
                    <span className="text-xs text-slate-400">
                      Padrão: {servico.preco_padrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {ehParceiro && (
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      disabled={!podeEditar}
                      placeholder="—"
                      value={valoresParceiro[servico.id] ?? ''}
                      onChange={(e) =>
                        setValoresParceiro((prev) => ({ ...prev, [servico.id]: e.target.value }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  )}

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
                        {(
                          (precoReferencia(servico.id, servico.preco_padrao) * bruto) /
                          100
                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </div>

                  {ehParceiro && (
                    <button
                      type="button"
                      disabled={!podeEditar}
                      onClick={() => alternarModo(servico.id, servico.preco_padrao)}
                      title={modo === 'valor' ? 'Trocar para % do Preço do Parceiro' : 'Trocar para valor em R$'}
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
