import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Search, Loader2, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useOrdensServico } from '../ordens-servico/hooks/useOrdensServico'
import { STATUS_OS_LABEL, referenciaOrdemExibicao, type OrdemServicoComRelacoes, type StatusOS } from '@/types/domain'

type FiltroStatus = 'todos' | StatusOS

const STATUS_FILTROS: FiltroStatus[] = [
  'todos',
  'recebido',
  'em_producao',
  'pronto_entrega',
  'entregue',
  'cancelado',
]

const STATUS_BADGE_VARIANT: Record<StatusOS, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  recebido: 'info',
  em_producao: 'warning',
  pronto_entrega: 'brand',
  entregue: 'success',
  cancelado: 'danger',
}

/** Padrão de vias por OS: uma via para cada unidade de serviço da ordem (mínimo 1). */
function quantidadePadrao(ordem: OrdemServicoComRelacoes) {
  const soma = ordem.itens.reduce((acc, item) => acc + item.quantidade, 0)
  return Math.max(1, soma)
}

export function CanhotosPage() {
  const navigate = useNavigate()
  const { data: ordens, isLoading } = useOrdensServico()
  const { data: empresaConfig } = useEmpresaConfig()

  const [busca, setBusca] = React.useState('')
  const [statusFiltro, setStatusFiltro] = React.useState<FiltroStatus>('todos')
  const [mesFiltro, setMesFiltro] = React.useState('todos')
  const [selecionadas, setSelecionadas] = React.useState<Set<string>>(new Set())
  const [quantidades, setQuantidades] = React.useState<Record<string, number>>({})
  const [gerando, setGerando] = React.useState(false)

  const meses = React.useMemo(() => {
    const set = new Set<string>()
    for (const o of ordens ?? []) set.add(o.mes_referencia)
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((mes) => ({ value: mes, label: format(parseISO(mes), "MMMM 'de' yyyy", { locale: ptBR }) }))
  }, [ordens])

  const filtradas = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (ordens ?? []).filter((o) => {
      if (statusFiltro !== 'todos' && o.status !== statusFiltro) return false
      if (mesFiltro !== 'todos' && o.mes_referencia !== mesFiltro) return false
      if (!buscaLower) return true
      return (
        String(o.numero_os).includes(buscaLower) ||
        (o.numero_os_cliente ?? '').toLowerCase().includes(buscaLower) ||
        (o.cliente_final ?? '').toLowerCase().includes(buscaLower) ||
        (o.nome_paciente ?? '').toLowerCase().includes(buscaLower) ||
        o.entidade.nome.toLowerCase().includes(buscaLower) ||
        o.itens.some((item) => item.servico.nome.toLowerCase().includes(buscaLower))
      )
    })
  }, [ordens, busca, statusFiltro, mesFiltro])

  const todasFiltradasSelecionadas = filtradas.length > 0 && filtradas.every((o) => selecionadas.has(o.id))

  function alternarSelecao(id: string) {
    setSelecionadas((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  function alternarSelecionarTodas() {
    setSelecionadas(todasFiltradasSelecionadas ? new Set() : new Set(filtradas.map((o) => o.id)))
  }

  function alterarQuantidade(id: string, valor: number) {
    setQuantidades((prev) => ({ ...prev, [id]: Math.max(1, Math.round(valor) || 1) }))
  }

  async function imprimirCanhotos() {
    const selecionadasOrdens = (ordens ?? []).filter((o) => selecionadas.has(o.id))
    if (selecionadasOrdens.length === 0) return
    setGerando(true)
    try {
      // Import dinâmico: @react-pdf/renderer é pesada e só é necessária
      // quando alguém realmente gera o PDF — mantém fora do bundle inicial.
      const { baixarCanhotosPdf } = await import('./components/CanhotosPdf')
      await baixarCanhotosPdf(selecionadasOrdens, quantidades, empresaConfig)
    } catch {
      toast.error('Não foi possível gerar o PDF agora. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/relatorios')}
        className="flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} />
        Relatórios
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Imprimir canhotos</h1>
          <p className="text-sm text-slate-500">
            Selecione as OS, ajuste quantas vias de cada uma e imprima numa página só, com marcação de recorte.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nº OS, registro, cliente, serviço..."
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
              {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
            </option>
          ))}
        </select>
      </div>

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

      {selecionadas.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-2.5">
          <span className="text-sm text-brand-800">
            {selecionadas.size} OS selecionada{selecionadas.size === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelecionadas(new Set())}
              className="text-xs font-medium text-brand-700 hover:text-brand-900"
            >
              Limpar seleção
            </button>
            <Button size="sm" onClick={imprimirCanhotos} disabled={gerando}>
              {gerando ? <Loader2 size={15} className="animate-spin" /> : <Scissors size={15} />}
              Imprimir canhotos
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhuma OS encontrada com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300"
                    checked={todasFiltradasSelecionadas}
                    onChange={alternarSelecionarTodas}
                    aria-label="Selecionar todas"
                  />
                </th>
                <th className="px-4 py-3">Nº OS / Registro</th>
                <th className="px-4 py-3">Cliente / Parceiro</th>
                <th className="px-4 py-3">Cliente final / Paciente</th>
                <th className="px-4 py-3">Serviços</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="w-24 px-4 py-3">Vias</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((ordem) => (
                <tr
                  key={ordem.id}
                  onClick={() => alternarSelecao(ordem.id)}
                  className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300"
                      checked={selecionadas.has(ordem.id)}
                      onChange={() => alternarSelecao(ordem.id)}
                      aria-label={`Selecionar ${referenciaOrdemExibicao(ordem).rotulo} ${referenciaOrdemExibicao(ordem).numero}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-400">#{referenciaOrdemExibicao(ordem).numero}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-800">{ordem.entidade.nome}</span>
                      <Badge variant={ordem.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'}>
                        {ordem.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {ordem.cliente_final || ordem.nome_paciente ? (
                      <div className="flex flex-col">
                        {ordem.cliente_final && <span>{ordem.cliente_final}</span>}
                        {ordem.nome_paciente && (
                          <span className="text-xs text-slate-400">{ordem.nome_paciente}</span>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {ordem.itens.length === 1 ? (
                      ordem.itens[0].servico.nome
                    ) : (
                      <span title={ordem.itens.map((i) => i.servico.nome).join(', ')}>
                        {ordem.itens.length} serviços
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[ordem.status]}>{STATUS_OS_LABEL[ordem.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {ordem.data_entrega
                      ? format(parseISO(ordem.data_entrega), 'dd/MM/yyyy')
                      : ordem.data_prevista
                        ? format(parseISO(ordem.data_prevista), 'dd/MM/yyyy')
                        : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min={1}
                      value={quantidades[ordem.id] ?? quantidadePadrao(ordem)}
                      onChange={(e) => alterarQuantidade(ordem.id, Number(e.target.value))}
                      className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      aria-label={`Quantidade de canhotos do ${referenciaOrdemExibicao(ordem).rotulo} ${referenciaOrdemExibicao(ordem).numero}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
