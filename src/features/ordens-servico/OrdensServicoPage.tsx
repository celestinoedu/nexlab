import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LayoutGrid, List, Plus, Search, Loader2, Wrench, Wallet, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useOrdensServico } from './hooks/useOrdensServico'
import { KanbanBoard } from './components/KanbanBoard'
import { ListaOrdensServico } from './components/ListaOrdensServico'
import { OrdemServicoFormDialog } from './components/OrdemServicoFormDialog'
import {
  STATUS_OS_LABEL,
  valorTotalOrdem,
  type OrdemServicoComRelacoes,
  type StatusOS,
} from '@/types/domain'

type Visao = 'kanban' | 'lista'
type FiltroStatus = 'todos' | StatusOS

const STATUS_FILTROS: FiltroStatus[] = [
  'todos',
  'recebido',
  'em_producao',
  'pronto_entrega',
  'entregue',
  'cancelado',
]

export function OrdensServicoPage() {
  const { data: ordens, isLoading } = useOrdensServico()
  const { data: empresaConfig } = useEmpresaConfig()
  // Lista é a visão padrão — Kanban continua disponível pelo toggle.
  const [visao, setVisao] = React.useState<Visao>('lista')
  const [busca, setBusca] = React.useState('')
  const [statusFiltro, setStatusFiltro] = React.useState<FiltroStatus>('todos')
  const [mesFiltro, setMesFiltro] = React.useState('todos')
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [ordemEditando, setOrdemEditando] = React.useState<OrdemServicoComRelacoes | null>(null)

  const meses = React.useMemo(() => {
    const set = new Set<string>()
    for (const o of ordens ?? []) set.add(o.mes_referencia)
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((mes) => ({ value: mes, label: format(parseISO(mes), "MMMM 'de' yyyy", { locale: ptBR }) }))
  }, [ordens])

  const filtradosBase = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (ordens ?? []).filter((o) => {
      if (mesFiltro !== 'todos' && o.mes_referencia !== mesFiltro) return false
      if (!buscaLower) return true
      return (
        String(o.numero_os).includes(buscaLower) ||
        (o.cliente_final ?? '').toLowerCase().includes(buscaLower) ||
        (o.nome_paciente ?? '').toLowerCase().includes(buscaLower) ||
        o.entidade.nome.toLowerCase().includes(buscaLower) ||
        o.itens.some((item) => item.servico.nome.toLowerCase().includes(buscaLower))
      )
    })
  }, [ordens, busca, mesFiltro])

  const filtradosLista = React.useMemo(
    () => filtradosBase.filter((o) => statusFiltro === 'todos' || o.status === statusFiltro),
    [filtradosBase, statusFiltro],
  )

  // KPIs sempre pelo período (mês) filtrado, independente da busca ou do
  // chip de status da lista — dão uma visão geral do período, não da busca atual.
  const ordensDoPeriodo = React.useMemo(
    () => (ordens ?? []).filter((o) => mesFiltro === 'todos' || o.mes_referencia === mesFiltro),
    [ordens, mesFiltro],
  )
  const kpiEmProducao = ordensDoPeriodo.filter((o) => o.status === 'em_producao').length
  const kpiEntregue = ordensDoPeriodo.filter((o) => o.status === 'entregue').length
  const kpiAReceber = ordensDoPeriodo
    .filter((o) => o.status !== 'cancelado' && o.status_pagamento === 'pendente')
    .reduce((acc, o) => acc + valorTotalOrdem(o), 0)

  function abrirNovaOrdem() {
    setOrdemEditando(null)
    setDialogAberto(true)
  }

  function abrirEdicao(ordem: OrdemServicoComRelacoes) {
    setOrdemEditando(ordem)
    setDialogAberto(true)
  }

  async function baixarPdf(ordem: OrdemServicoComRelacoes) {
    try {
      // Import dinâmico: @react-pdf/renderer é pesada e só é necessária
      // quando alguém realmente baixa um PDF — mantém fora do bundle inicial.
      const { baixarPdfOrdemServico } = await import('./components/OrdemServicoPdf')
      await baixarPdfOrdemServico(ordem, empresaConfig)
    } catch {
      toast.error('Não foi possível gerar o PDF agora. Tente novamente.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Ordens de Serviço</h1>
        <Button variant="accent" onClick={abrirNovaOrdem}>
          <Plus size={18} />
          Nova OS
        </Button>
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        <KpiCard
          icon={Wrench}
          label="Em Produção"
          value={String(kpiEmProducao)}
          colorClass="bg-warning-100 text-warning-700"
          className="sm:w-56"
        />
        <KpiCard
          icon={PackageCheck}
          label="Entregue"
          value={String(kpiEntregue)}
          colorClass="bg-success-100 text-success-700"
          className="sm:w-56"
        />
        <KpiCard
          icon={Wallet}
          label="Total a Receber"
          value={kpiAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          colorClass="bg-brand-100 text-brand-700"
          className="sm:ml-auto sm:w-64"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nº OS, cliente, serviço..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <option value="todos">Todos os meses</option>
          {meses.map((m) => (
            <option key={m.value} value={m.value}>
              {capitalizar(m.label)}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <ToggleButton active={visao === 'lista'} onClick={() => setVisao('lista')} icon={List} label="Lista" />
          <ToggleButton active={visao === 'kanban'} onClick={() => setVisao('kanban')} icon={LayoutGrid} label="Kanban" />
        </div>
      </div>

      {visao === 'lista' && (
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTROS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFiltro(status)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                statusFiltro === status
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {status === 'todos' ? 'Todos' : STATUS_OS_LABEL[status]}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : visao === 'kanban' ? (
        <KanbanBoard ordens={filtradosBase} onEditOrdem={abrirEdicao} onImprimirOrdem={baixarPdf} />
      ) : (
        <ListaOrdensServico ordens={filtradosLista} onEditOrdem={abrirEdicao} onImprimirOrdem={baixarPdf} />
      )}

      <OrdemServicoFormDialog open={dialogAberto} onOpenChange={setDialogAberto} ordem={ordemEditando} />
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof LayoutGrid
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-brand-50 text-brand-800' : 'text-slate-500 hover:bg-slate-50',
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function KpiCard({
  icon: Icon,
  label,
  value,
  colorClass,
  className,
}: {
  icon: typeof Wrench
  label: string
  value: string
  colorClass: string
  className?: string
}) {
  return (
    <div className={cn('flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4', className)}>
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', colorClass)}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-xs font-medium text-slate-500">{label}</span>
        <span className="block truncate text-xl font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  )
}
