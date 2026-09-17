import * as React from 'react'
import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns'
import { Download, Loader2, Search } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/shared/Combobox'
import { useEntidades } from '@/hooks/useEntidades'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useOrdensServico } from '@/features/ordens-servico/hooks/useOrdensServico'
import {
  referenciaOrdemExibicao,
  STATUS_OS_LABEL,
  type Entidade,
  type OrdemServicoComRelacoes,
} from '@/types/domain'

type FormatoRelatorio = 'periodo' | 'os'
type TipoPeriodo = 'personalizado' | 'mensal' | 'semestral' | 'anual'

interface RelatorioParceiroDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entidadeFixa?: Entidade
  formatoInicial?: FormatoRelatorio
}

interface IntervaloRelatorio {
  inicio: string
  fim: string
  label: string
}

function normalizarBusca(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function intervaloDoPeriodo(
  tipo: TipoPeriodo,
  dataInicio: string,
  dataFim: string,
  mes: string,
  ano: string,
  semestre: '1' | '2',
): IntervaloRelatorio | null {
  if (tipo === 'personalizado') {
    if (!dataInicio || !dataFim) return null
    return {
      inicio: dataInicio,
      fim: dataFim,
      label: `${format(parseISO(dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(dataFim), 'dd/MM/yyyy')}`,
    }
  }

  if (tipo === 'mensal') {
    if (!mes) return null
    const inicio = `${mes}-01`
    return {
      inicio,
      fim: format(endOfMonth(parseISO(inicio)), 'yyyy-MM-dd'),
      label: format(parseISO(inicio), 'MM/yyyy'),
    }
  }

  if (!/^\d{4}$/.test(ano) || Number(ano) < 2000 || Number(ano) > 2100) return null
  if (tipo === 'anual') return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, label: `Ano de ${ano}` }

  return semestre === '1'
    ? { inicio: `${ano}-01-01`, fim: `${ano}-06-30`, label: `1º semestre de ${ano}` }
    : { inicio: `${ano}-07-01`, fim: `${ano}-12-31`, label: `2º semestre de ${ano}` }
}

function RadioCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean
  onChange: () => void
  title: string
  description: string
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
        checked ? 'border-brand-500 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <input
        type="radio"
        name="formato-relatorio-entidade"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-brand-600"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  )
}

export function RelatorioParceiroDialog({
  open,
  onOpenChange,
  entidadeFixa,
  formatoInicial = 'periodo',
}: RelatorioParceiroDialogProps) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const { data: entidades, isLoading: carregandoEntidades } = useEntidades()
  const { data: ordens, isLoading: carregandoOrdens } = useOrdensServico()
  const { data: empresaConfig } = useEmpresaConfig()
  const [entidadeId, setEntidadeId] = React.useState<string | null>(entidadeFixa?.id ?? null)
  const [formato, setFormato] = React.useState<FormatoRelatorio>(formatoInicial)
  const [tipoPeriodo, setTipoPeriodo] = React.useState<TipoPeriodo>('mensal')
  const [dataInicio, setDataInicio] = React.useState(hoje)
  const [dataFim, setDataFim] = React.useState(hoje)
  const [mes, setMes] = React.useState(hoje.slice(0, 7))
  const [ano, setAno] = React.useState(hoje.slice(0, 4))
  const [semestre, setSemestre] = React.useState<'1' | '2'>(Number(hoje.slice(5, 7)) <= 6 ? '1' : '2')
  const [ordensSelecionadas, setOrdensSelecionadas] = React.useState<string[]>([])
  const [buscaOrdens, setBuscaOrdens] = React.useState('')
  const [gerando, setGerando] = React.useState(false)

  const entidade = entidadeFixa ?? entidades?.find((item) => item.id === entidadeId)
  const ordensDaEntidade = React.useMemo(
    () => (ordens ?? [])
      .filter((ordem) => ordem.entidade_id === entidadeId)
      .sort((a, b) => b.data_recebimento.localeCompare(a.data_recebimento) || b.numero_os - a.numero_os),
    [ordens, entidadeId],
  )
  const ordensVisiveis = React.useMemo(() => {
    const termo = normalizarBusca(buscaOrdens)
    if (!termo) return ordensDaEntidade

    return ordensDaEntidade.filter((ordem) => normalizarBusca([
      referenciaOrdemExibicao(ordem).numero,
      ordem.numero_os,
      ordem.cliente_final,
      ordem.nome_paciente,
      ...ordem.itens.map((item) => item.servico.nome),
    ].filter(Boolean).join(' ')).includes(termo))
  }, [ordensDaEntidade, buscaOrdens])
  const todasVisiveisSelecionadas = ordensVisiveis.length > 0 &&
    ordensVisiveis.every((ordem) => ordensSelecionadas.includes(ordem.id))

  const intervalo = intervaloDoPeriodo(tipoPeriodo, dataInicio, dataFim, mes, ano, semestre)
  const periodoPersonalizadoInvalido = tipoPeriodo === 'personalizado' && Boolean(
    dataInicio && dataFim &&
      (dataInicio > dataFim || differenceInCalendarDays(parseISO(dataFim), parseISO(dataInicio)) > 30),
  )
  const podeGerar = Boolean(
    entidade &&
      !gerando &&
      (formato === 'periodo'
        ? intervalo && !periodoPersonalizadoInvalido
        : ordensSelecionadas.length > 0),
  )

  function alternarOrdem(ordemId: string) {
    setOrdensSelecionadas((atuais) =>
      atuais.includes(ordemId) ? atuais.filter((id) => id !== ordemId) : [...atuais, ordemId],
    )
  }

  function alterarAbertura(aberto: boolean) {
    if (!aberto) {
      setEntidadeId(entidadeFixa?.id ?? null)
      setFormato(formatoInicial)
      setOrdensSelecionadas([])
      setBuscaOrdens('')
    }
    onOpenChange(aberto)
  }

  async function gerarRelatorio() {
    if (!entidade || !podeGerar) return

    let ordensFiltradas: OrdemServicoComRelacoes[]
    let filtroLabel: string
    let totalLabel: string | undefined

    if (formato === 'periodo') {
      if (!intervalo) return
      ordensFiltradas = ordensDaEntidade.filter(
        (ordem) => ordem.data_recebimento >= intervalo.inicio && ordem.data_recebimento <= intervalo.fim,
      )
      filtroLabel = intervalo.label
    } else {
      ordensFiltradas = ordensDaEntidade.filter((ordem) => ordensSelecionadas.includes(ordem.id))
      const referencias = ordensFiltradas.map((ordem) => `#${referenciaOrdemExibicao(ordem).numero}`)
      filtroLabel = `OS selecionadas: ${referencias.join(', ')}`
      totalLabel = 'Total das OS:'
    }

    if (ordensFiltradas.length === 0) {
      toast.warning('Nenhuma ordem de serviço encontrada para a seleção informada.')
      return
    }

    setGerando(true)
    try {
      const { baixarRelatorioEntidade } = await import('@/features/entidades/components/RelatorioFechamentoPdf')
      await baixarRelatorioEntidade(entidade, ordensFiltradas, filtroLabel, empresaConfig, totalLabel)
      alterarAbertura(false)
    } catch {
      toast.error('Não foi possível gerar o relatório agora. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={alterarAbertura}>
      <DialogContent className="flex h-[calc(100%-1rem)] max-h-[calc(100%-1rem)] w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden p-4 sm:h-[calc(100%-3rem)] sm:max-h-[calc(100%-3rem)] sm:w-[calc(100%-3rem)] sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Relatório por Cliente/Parceiro</DialogTitle>
          <DialogDescription>Escolha o cliente ou parceiro e como deseja montar o arquivo PDF.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="entidade-relatorio" className="text-xs font-medium text-slate-600">Cliente ou parceiro</label>
            {entidadeFixa ? (
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                {entidadeFixa.nome}
              </div>
            ) : (
              <Combobox
                id="entidade-relatorio"
                options={(entidades ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.nome} · ${item.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}`,
                }))}
                value={entidadeId}
                onChange={(novaEntidadeId) => {
                  setEntidadeId(novaEntidadeId)
                  setOrdensSelecionadas([])
                  setBuscaOrdens('')
                }}
                placeholder={carregandoEntidades ? 'Carregando cadastros...' : 'Selecione um cliente ou parceiro'}
                searchPlaceholder="Buscar cliente ou parceiro..."
                emptyMessage="Nenhum cliente ou parceiro encontrado."
                disabled={carregandoEntidades}
              />
            )}
          </div>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-medium text-slate-600">Formato do relatório</legend>
            <RadioCard
              checked={formato === 'periodo'}
              onChange={() => setFormato('periodo')}
              title="Por período"
              description="Personalizado, mensal, semestral ou anual."
            />
            <RadioCard
              checked={formato === 'os'}
              onChange={() => setFormato('os')}
              title="Por OS selecionadas"
              description="Escolha as Ordens de Serviço que entrarão no PDF."
            />
          </fieldset>

          {formato === 'periodo' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="tipo-periodo" className="text-xs font-medium text-slate-600">Período</label>
                  <select
                    id="tipo-periodo"
                    value={tipoPeriodo}
                    onChange={(event) => setTipoPeriodo(event.target.value as TipoPeriodo)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    <option value="personalizado">Período personalizado (máximo de 30 dias)</option>
                    <option value="mensal">Mensal</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                {tipoPeriodo === 'personalizado' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="entidade-data-inicio" className="text-xs font-medium text-slate-600">Data inicial</label>
                      <Input id="entidade-data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="entidade-data-fim" className="text-xs font-medium text-slate-600">Data final</label>
                      <Input id="entidade-data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                    </div>
                    {periodoPersonalizadoInvalido && (
                      <p className="text-xs font-medium text-red-600 sm:col-span-2">
                        Informe uma data final igual ou posterior à inicial, respeitando o limite de 30 dias.
                      </p>
                    )}
                  </>
                )}

                {tipoPeriodo === 'mensal' && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="entidade-mes" className="text-xs font-medium text-slate-600">Mês</label>
                    <Input id="entidade-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
                  </div>
                )}

                {(tipoPeriodo === 'semestral' || tipoPeriodo === 'anual') && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="entidade-ano" className="text-xs font-medium text-slate-600">Ano</label>
                    <Input id="entidade-ano" type="number" min="2000" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} />
                  </div>
                )}
                {tipoPeriodo === 'semestral' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="entidade-semestre" className="text-xs font-medium text-slate-600">Semestre</label>
                    <select
                      id="entidade-semestre"
                      value={semestre}
                      onChange={(e) => setSemestre(e.target.value as '1' | '2')}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    >
                      <option value="1">1º semestre</option>
                      <option value="2">2º semestre</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-600">
                  Ordens de Serviço a incluir
                  {entidadeId && <span className="ml-1 font-normal text-slate-400">({ordensVisiveis.length} de {ordensDaEntidade.length})</span>}
                </p>
                {ordensVisiveis.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const idsVisiveis = new Set(ordensVisiveis.map((ordem) => ordem.id))
                      setOrdensSelecionadas((atuais) => todasVisiveisSelecionadas
                        ? atuais.filter((id) => !idsVisiveis.has(id))
                        : Array.from(new Set([...atuais, ...idsVisiveis])))
                    }}
                    className="text-xs font-medium text-brand-700 hover:text-brand-800"
                  >
                    {todasVisiveisSelecionadas
                      ? (buscaOrdens ? 'Limpar visíveis' : 'Limpar seleção')
                      : (buscaOrdens ? 'Selecionar visíveis' : 'Selecionar todas')}
                  </button>
                )}
              </div>
              {!entidadeId ? (
                <p className="text-sm text-slate-400">Selecione um cliente ou parceiro para listar as Ordens de Serviço.</p>
              ) : carregandoOrdens ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-brand-600" size={22} /></div>
              ) : ordensDaEntidade.length === 0 ? (
                <p className="text-sm text-slate-400">Este cadastro ainda não possui Ordens de Serviço.</p>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      value={buscaOrdens}
                      onChange={(event) => setBuscaOrdens(event.target.value)}
                      placeholder="Buscar por Nº OS, cliente, paciente ou serviço..."
                      aria-label="Buscar Ordens de Serviço"
                      className="pl-9"
                    />
                  </div>
                  {ordensVisiveis.length === 0 ? (
                    <p className="rounded-lg bg-white px-3 py-6 text-center text-sm text-slate-400">
                      Nenhuma OS encontrada para essa busca.
                    </p>
                  ) : (
                <div className="grid max-h-[42dvh] gap-2 overflow-x-hidden overflow-y-auto pr-1 lg:grid-cols-2">
                  {ordensVisiveis.map((ordem) => {
                    const referencia = referenciaOrdemExibicao(ordem)
                    const pessoa = [ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ')
                    const servicos = ordem.itens
                      .map((item) => `${item.servico.nome}${item.quantidade > 1 ? ` ×${item.quantidade}` : ''}`)
                      .join(', ')
                    return (
                    <label key={ordem.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={ordensSelecionadas.includes(ordem.id)}
                        onChange={() => alternarOrdem(ordem.id)}
                        className="mt-1 accent-brand-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 font-medium text-slate-800">
                          <span>#{referencia.numero}</span>
                          <span className="font-normal text-slate-400">{format(parseISO(ordem.data_recebimento), 'dd/MM/yyyy')}</span>
                          <span className="font-normal text-slate-500">{STATUS_OS_LABEL[ordem.status]}</span>
                        </span>
                        {pessoa && <span className="block truncate text-xs text-slate-500">{pessoa}</span>}
                        <span className="block truncate text-xs text-slate-400">{servicos || 'Sem serviços'}</span>
                      </span>
                    </label>
                    )
                  })}
                </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="secondary" onClick={() => alterarAbertura(false)}>Cancelar</Button>
          <Button variant="accent" onClick={gerarRelatorio} disabled={!podeGerar || carregandoOrdens}>
            {gerando ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
