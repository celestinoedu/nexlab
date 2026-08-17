import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Download, FileText, Loader2, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/shared/Combobox'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useOrdensServico } from '@/features/ordens-servico/hooks/useOrdensServico'
import {
  STATUS_OS_LABEL,
  type OrdemServicoComRelacoes,
} from '@/types/domain'
import { itensDoRelatorio, valorOrdemNoRelatorio } from './relatorioPersonalizado'

const TODOS = 'todos'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function opcoesUnicas(
  ordens: OrdemServicoComRelacoes[],
  tipo: 'entidade' | 'servico',
): ComboboxOption[] {
  const mapa = new Map<string, ComboboxOption>()

  for (const ordem of ordens) {
    if (tipo === 'entidade') {
      mapa.set(ordem.entidade.id, {
        value: ordem.entidade.id,
        label: ordem.entidade.nome,
        hint: ordem.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente',
      })
      continue
    }

    for (const item of ordem.itens) {
      mapa.set(item.servico.id, { value: item.servico.id, label: item.servico.nome })
    }
  }

  return Array.from(mapa.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

export function RelatoriosPersonalizadosPage() {
  const navigate = useNavigate()
  const { data: ordens, isLoading } = useOrdensServico()
  const { data: empresaConfig } = useEmpresaConfig()
  const [dataInicio, setDataInicio] = React.useState('')
  const [dataFim, setDataFim] = React.useState('')
  const [entidadeId, setEntidadeId] = React.useState(TODOS)
  const [servicoId, setServicoId] = React.useState(TODOS)
  const [gerando, setGerando] = React.useState(false)

  const listaOrdens = React.useMemo(() => ordens ?? [], [ordens])
  const entidadeOptions = React.useMemo(
    () => [{ value: TODOS, label: 'Todos os clientes e parceiros' }, ...opcoesUnicas(listaOrdens, 'entidade')],
    [listaOrdens],
  )
  const servicoOptions = React.useMemo(
    () => [{ value: TODOS, label: 'Todos os serviços' }, ...opcoesUnicas(listaOrdens, 'servico')],
    [listaOrdens],
  )

  const filtrosInvalidos = Boolean(dataInicio && dataFim && dataInicio > dataFim)

  const ordensFiltradas = React.useMemo(() => {
    if (filtrosInvalidos) return []
    return listaOrdens
      .filter((ordem) => {
        if (dataInicio && ordem.data_recebimento < dataInicio) return false
        if (dataFim && ordem.data_recebimento > dataFim) return false
        if (entidadeId !== TODOS && ordem.entidade.id !== entidadeId) return false
        if (servicoId !== TODOS && !ordem.itens.some((item) => item.servico.id === servicoId)) return false
        return true
      })
      .sort((a, b) => b.data_recebimento.localeCompare(a.data_recebimento) || b.numero_os - a.numero_os)
  }, [listaOrdens, dataInicio, dataFim, entidadeId, servicoId, filtrosInvalidos])

  const valorTotal = React.useMemo(
    () => ordensFiltradas.reduce(
      (total, ordem) => total + valorOrdemNoRelatorio(ordem, servicoId === TODOS ? null : servicoId),
      0,
    ),
    [ordensFiltradas, servicoId],
  )

  const filtrosDescricao = React.useMemo(() => ({
    periodo:
      dataInicio || dataFim
        ? `${dataInicio ? format(parseISO(dataInicio), 'dd/MM/yyyy') : 'sem limite'} a ${
            dataFim ? format(parseISO(dataFim), 'dd/MM/yyyy') : 'sem limite'
          }`
        : 'Todos os períodos',
    entidade: entidadeOptions.find((opcao) => opcao.value === entidadeId)?.label ?? 'Todos os clientes e parceiros',
    servico: servicoOptions.find((opcao) => opcao.value === servicoId)?.label ?? 'Todos os serviços',
  }), [dataInicio, dataFim, entidadeId, servicoId, entidadeOptions, servicoOptions])

  function limparFiltros() {
    setDataInicio('')
    setDataFim('')
    setEntidadeId(TODOS)
    setServicoId(TODOS)
  }

  async function baixarRelatorio() {
    if (ordensFiltradas.length === 0 || filtrosInvalidos) return
    setGerando(true)
    try {
      const { baixarRelatorioPersonalizado } = await import('./components/RelatorioPersonalizadoPdf')
      await baixarRelatorioPersonalizado(
        ordensFiltradas,
        filtrosDescricao,
        servicoId === TODOS ? null : servicoId,
        empresaConfig,
      )
    } catch {
      toast.error('Não foi possível gerar o relatório agora. Tente novamente.')
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

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Relatórios personalizados</h1>
        <p className="text-sm text-slate-500">
          Monte um extrato de OS combinando período de recebimento, serviço e cliente.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="data-inicio" className="text-xs font-medium text-slate-600">Data inicial</label>
            <Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="data-fim" className="text-xs font-medium text-slate-600">Data final</label>
            <Input id="data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filtro-servico" className="text-xs font-medium text-slate-600">Serviço</label>
            <Combobox
              id="filtro-servico"
              options={servicoOptions}
              value={servicoId}
              onChange={setServicoId}
              searchPlaceholder="Buscar serviço..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filtro-entidade" className="text-xs font-medium text-slate-600">Cliente / Parceiro</label>
            <Combobox
              id="filtro-entidade"
              options={entidadeOptions}
              value={entidadeId}
              onChange={setEntidadeId}
              searchPlaceholder="Buscar cliente ou parceiro..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Button variant="secondary" size="sm" onClick={limparFiltros}>
              <RotateCcw size={15} />
              Limpar filtros
            </Button>
            {filtrosInvalidos && (
              <span className="text-xs font-medium text-red-600">A data final deve ser igual ou posterior à data inicial.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <FileText size={19} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Quantidade de OS</p>
              <p className="text-xl font-semibold text-slate-900">{ordensFiltradas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {servicoId === TODOS ? 'Valor total das OS listadas' : 'Valor total do serviço selecionado'}
              </p>
              <p className="text-xl font-semibold text-brand-800">{formatarMoeda(valorTotal)}</p>
            </div>
            <Button variant="accent" size="sm" onClick={baixarRelatorio} disabled={gerando || ordensFiltradas.length === 0 || filtrosInvalidos}>
              {gerando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Baixar PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : ordensFiltradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhuma OS encontrada com os filtros informados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Nº OS</th>
                <th className="px-4 py-3">Recebimento</th>
                <th className="px-4 py-3">Cliente / Parceiro</th>
                <th className="px-4 py-3">Cliente final / Paciente</th>
                <th className="px-4 py-3">Serviços</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {ordensFiltradas.map((ordem) => (
                <tr key={ordem.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-500">#{ordem.numero_os}</td>
                  <td className="px-4 py-3 text-slate-500">{format(parseISO(ordem.data_recebimento), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{ordem.entidade.nome}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {[ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ') || '—'}
                  </td>
                  <td className="max-w-64 px-4 py-3 text-slate-600">
                    {itensDoRelatorio(ordem, servicoId === TODOS ? null : servicoId)
                      .map((item) => `${item.servico.nome}${item.quantidade > 1 ? ` ×${item.quantidade}` : ''}`)
                      .join(', ')}
                  </td>
                  <td className="px-4 py-3"><Badge variant="neutral">{STATUS_OS_LABEL[ordem.status]}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                    {formatarMoeda(valorOrdemNoRelatorio(ordem, servicoId === TODOS ? null : servicoId))}
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
