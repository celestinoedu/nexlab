import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LayoutGrid, List, Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDemandas } from './hooks/useDemandas'
import { KanbanBoard } from './components/KanbanBoard'
import { ListaDemandas } from './components/ListaDemandas'
import { DemandaFormDialog } from './components/DemandaFormDialog'
import { STATUS_DEMANDA_LABEL, type DemandaComRelacoes, type StatusDemanda } from '@/types/domain'

type Visao = 'kanban' | 'lista'
type FiltroStatus = 'todos' | StatusDemanda

const STATUS_FILTROS: FiltroStatus[] = [
  'todos',
  'recebido',
  'em_producao',
  'pronto_entrega',
  'entregue',
  'cancelado',
]

export function DemandasPage() {
  const { data: demandas, isLoading } = useDemandas()
  const [visao, setVisao] = React.useState<Visao>('kanban')
  const [busca, setBusca] = React.useState('')
  const [statusFiltro, setStatusFiltro] = React.useState<FiltroStatus>('todos')
  const [mesFiltro, setMesFiltro] = React.useState('todos')
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [demandaEditando, setDemandaEditando] = React.useState<DemandaComRelacoes | null>(null)

  const meses = React.useMemo(() => {
    const set = new Set<string>()
    for (const d of demandas ?? []) set.add(d.mes_referencia)
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((mes) => ({ value: mes, label: format(parseISO(mes), "MMMM 'de' yyyy", { locale: ptBR }) }))
  }, [demandas])

  const filtradosBase = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (demandas ?? []).filter((d) => {
      if (mesFiltro !== 'todos' && d.mes_referencia !== mesFiltro) return false
      if (!buscaLower) return true
      return (
        String(d.numero_os).includes(buscaLower) ||
        (d.cliente_final ?? '').toLowerCase().includes(buscaLower) ||
        d.entidade.nome.toLowerCase().includes(buscaLower) ||
        d.servico.nome.toLowerCase().includes(buscaLower)
      )
    })
  }, [demandas, busca, mesFiltro])

  const filtradosLista = React.useMemo(
    () => filtradosBase.filter((d) => statusFiltro === 'todos' || d.status === statusFiltro),
    [filtradosBase, statusFiltro],
  )

  function abrirNovaDemanda() {
    setDemandaEditando(null)
    setDialogAberto(true)
  }

  function abrirEdicao(demanda: DemandaComRelacoes) {
    setDemandaEditando(demanda)
    setDialogAberto(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Demandas</h1>
        <Button variant="accent" onClick={abrirNovaDemanda}>
          <Plus size={18} />
          Nova Demanda
        </Button>
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
          <ToggleButton active={visao === 'kanban'} onClick={() => setVisao('kanban')} icon={LayoutGrid} label="Kanban" />
          <ToggleButton active={visao === 'lista'} onClick={() => setVisao('lista')} icon={List} label="Lista" />
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
              {status === 'todos' ? 'Todos' : STATUS_DEMANDA_LABEL[status]}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : visao === 'kanban' ? (
        <KanbanBoard demandas={filtradosBase} onEditDemanda={abrirEdicao} />
      ) : (
        <ListaDemandas demandas={filtradosLista} onEditDemanda={abrirEdicao} />
      )}

      <DemandaFormDialog open={dialogAberto} onOpenChange={setDialogAberto} demanda={demandaEditando} />
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
