import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, Copy, Plus, Search, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TotalInfo } from '@/components/shared/TotalInfo'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { useDespesas } from './hooks/useDespesas'
import { useDespesaMutations } from './hooks/useDespesaMutations'
import { DespesaFormDialog } from './components/DespesaFormDialog'
import { ExcluirDespesaDialog } from './components/ExcluirDespesaDialog'
import { fixasParaRepetir, mesAnterior, mesDaDespesa, mesmoDiaNoMes, mesSeguinte } from './regras'
import {
  STATUS_DESPESA_LABEL,
  TIPO_DESPESA_LABEL,
  type Despesa,
  type StatusDespesa,
  type TipoDespesa,
} from '@/types/domain'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function nomeDoMes(mes: string) {
  const nome = format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function Filtro<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T | 'todos'
  opcoes: Record<T, string>
  onChange: (valor: T | 'todos') => void
}) {
  const todas: [T | 'todos', string][] = [['todos', 'Todos'], ...(Object.entries(opcoes) as [T, string][])]
  return (
    <div className="flex flex-wrap gap-1.5">
      {todas.map(([opcao, rotulo]) => (
        <button
          key={opcao}
          type="button"
          onClick={() => onChange(opcao)}
          aria-pressed={valor === opcao}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            valor === opcao
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

function Indicador({ rotulo, valor, info, tom }: { rotulo: string; valor: number; info: string; tom: 'brand' | 'success' | 'warning' }) {
  const cores = {
    brand: 'bg-brand-50 text-brand-700 [&_strong]:text-brand-900',
    success: 'bg-success-100 text-success-700 [&_strong]:text-success-700',
    warning: 'bg-warning-100 text-warning-700 [&_strong]:text-warning-700',
  }
  return (
    <div className={cn('flex flex-col rounded-xl px-4 py-2', cores[tom])}>
      <div className="flex items-center gap-1 text-xs font-medium">
        <span>{rotulo}</span>
        <TotalInfo titulo={rotulo}>{info}</TotalInfo>
      </div>
      <strong className="text-lg font-semibold">{formatarMoeda(valor)}</strong>
    </div>
  )
}

export function DespesasPage() {
  const { data: despesas, isLoading, isError, refetch } = useDespesas()
  const { data: profile } = useProfile()
  const { deleteDespesa, createVariasDespesas, marcarDespesaPaga } = useDespesaMutations()
  const podeExcluir = profile?.role === 'admin'
  const [mes, setMes] = React.useState(format(new Date(), 'yyyy-MM'))
  const [busca, setBusca] = React.useState('')
  const [tipoFiltro, setTipoFiltro] = React.useState<TipoDespesa | 'todos'>('todos')
  const [statusFiltro, setStatusFiltro] = React.useState<StatusDespesa | 'todos'>('todos')
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [despesaSelecionada, setDespesaSelecionada] = React.useState<Despesa | null>(null)
  const [despesaExcluindo, setDespesaExcluindo] = React.useState<Despesa | null>(null)

  const doMes = React.useMemo(() => (despesas ?? []).filter((d) => mesDaDespesa(d) === mes), [despesas, mes])

  const filtradas = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return doMes.filter((d) => {
      if (tipoFiltro !== 'todos' && d.tipo !== tipoFiltro) return false
      if (statusFiltro !== 'todos' && d.status !== statusFiltro) return false
      if (!buscaLower) return true
      return d.descricao.toLowerCase().includes(buscaLower) || (d.categoria ?? '').toLowerCase().includes(buscaLower)
    })
  }, [doMes, busca, tipoFiltro, statusFiltro])

  const soma = (lista: Despesa[]) => lista.reduce((acc, d) => acc + d.valor, 0)
  const totalMes = soma(filtradas)
  const totalPago = soma(filtradas.filter((d) => d.status === 'pago'))
  const totalPendente = soma(filtradas.filter((d) => d.status === 'pendente'))
  const paraRepetir = React.useMemo(() => fixasParaRepetir(despesas ?? [], mes), [despesas, mes])

  function abrirNova() {
    setDespesaSelecionada(null)
    setDialogAberto(true)
  }

  function abrirEdicao(despesa: Despesa) {
    setDespesaSelecionada(despesa)
    setDialogAberto(true)
  }

  async function lancarFixas() {
    try {
      await createVariasDespesas.mutateAsync(
        paraRepetir.map((d) => ({
          tipo: 'fixa',
          status: 'pendente',
          categoria: d.categoria,
          descricao: d.descricao,
          valor: d.valor,
          data_despesa: mesmoDiaNoMes(d.data_despesa, mes),
          data_pagamento: null,
          observacoes: d.observacoes,
        })),
      )
      toast.success(
        paraRepetir.length === 1 ? '1 despesa fixa lançada como pendente.' : `${paraRepetir.length} despesas fixas lançadas como pendentes.`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível lançar agora.')
    }
  }

  async function marcarPaga(despesa: Despesa) {
    try {
      await marcarDespesaPaga.mutateAsync({ id: despesa.id, dataPagamento: format(new Date(), 'yyyy-MM-dd') })
      toast.success('Despesa marcada como paga.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar agora.')
    }
  }

  async function confirmarExclusao() {
    if (!despesaExcluindo) return
    try {
      await deleteDespesa.mutateAsync(despesaExcluindo.id)
      toast.success('Despesa excluída.')
      setDespesaExcluindo(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir agora.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Despesas</h1>
        <Button onClick={abrirNova}>
          <Plus size={18} />
          Nova despesa
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" aria-label="Mês anterior" onClick={() => setMes(mesAnterior(mes))}>
          <ChevronLeft size={16} />
        </Button>
        <label className="flex items-center gap-2">
          <span className="sr-only">Mês</span>
          <Input
            type="month"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
            className="h-9 w-44"
          />
        </label>
        <Button type="button" variant="secondary" size="sm" aria-label="Próximo mês" onClick={() => setMes(mesSeguinte(mes))}>
          <ChevronRight size={16} />
        </Button>
        <span className="text-sm font-medium text-slate-600">{nomeDoMes(mes)}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Total do mês"
          valor={totalMes}
          tom="brand"
          info="Soma as despesas cuja data/vencimento está no mês selecionado, respeitando os filtros de categoria, status e busca. Inclui pagas e pendentes."
        />
        <Indicador
          rotulo="Pago"
          valor={totalPago}
          tom="success"
          info="Despesas do mês já pagas, com os filtros atuais. O Fechamento Financeiro considera as despesas pagas pelo mês do pagamento."
        />
        <Indicador
          rotulo="A pagar"
          valor={totalPendente}
          tom="warning"
          info="Despesas do mês ainda pendentes, com os filtros atuais. Não entram no Fechamento Financeiro até serem pagas."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar descrição ou subcategoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Filtro valor={tipoFiltro} opcoes={TIPO_DESPESA_LABEL} onChange={setTipoFiltro} />
        <Filtro valor={statusFiltro} opcoes={STATUS_DESPESA_LABEL} onChange={setStatusFiltro} />
      </div>

      {paraRepetir.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <span>
            {paraRepetir.length === 1 ? 'Há 1 despesa fixa' : `Há ${paraRepetir.length} despesas fixas`} de{' '}
            {nomeDoMes(mesAnterior(mes)).toLowerCase()} ainda não lançada{paraRepetir.length === 1 ? '' : 's'} neste mês.
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={createVariasDespesas.isPending} onClick={lancarFixas}>
            {createVariasDespesas.isPending ? <Loader2 className="animate-spin" size={15} /> : <Copy size={15} />}
            Lançar como pendentes
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger-100 bg-danger-100 p-8 text-center text-sm text-danger-700">
          Não foi possível carregar as despesas. Os totais acima podem estar incompletos.
          <Button type="button" variant="secondary" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          {doMes.length === 0 ? `Nenhuma despesa lançada em ${nomeDoMes(mes).toLowerCase()}.` : 'Nenhuma despesa encontrada com esses filtros.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Data / vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((despesa) => (
                <tr
                  key={despesa.id}
                  onClick={() => abrirEdicao(despesa)}
                  className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{despesa.descricao}</span>
                    {despesa.categoria && <span className="block text-xs text-slate-400">{despesa.categoria}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={despesa.tipo === 'fixa' ? 'brand' : 'neutral'}>{TIPO_DESPESA_LABEL[despesa.tipo]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{format(parseISO(despesa.data_despesa), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={despesa.status === 'pago' ? 'success' : 'warning'}>{STATUS_DESPESA_LABEL[despesa.status]}</Badge>
                    {despesa.status === 'pago' && despesa.data_pagamento && (
                      <span className="block text-xs text-slate-400">
                        em {format(parseISO(despesa.data_pagamento), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatarMoeda(despesa.valor)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {despesa.status === 'pendente' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void marcarPaga(despesa)
                          }}
                          disabled={marcarDespesaPaga.isPending}
                          className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-success-700 hover:bg-success-100 disabled:opacity-50"
                          title="Marcar como paga hoje"
                        >
                          <CheckCircle2 size={15} />
                          Pagar
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDespesaExcluindo(despesa)
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-100 hover:text-danger-700"
                          aria-label="Excluir despesa"
                          title="Excluir despesa"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DespesaFormDialog open={dialogAberto} onOpenChange={setDialogAberto} despesa={despesaSelecionada} mesSugerido={mes} />
      <ExcluirDespesaDialog
        open={Boolean(despesaExcluindo)}
        onOpenChange={(open) => !open && setDespesaExcluindo(null)}
        despesa={despesaExcluindo}
        onConfirm={confirmarExclusao}
        excluindo={deleteDespesa.isPending}
      />
    </div>
  )
}
