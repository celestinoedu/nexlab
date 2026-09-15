import * as React from 'react'
import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns'
import { Download, Loader2 } from 'lucide-react'
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
import type { Entidade, OrdemServicoComRelacoes } from '@/types/domain'

type FormatoRelatorio = 'periodo' | 'servicos'
type TipoPeriodo = 'personalizado' | 'mensal' | 'semestral' | 'anual'

interface RelatorioParceiroDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parceiroFixo?: Entidade
  formatoInicial?: FormatoRelatorio
}

interface IntervaloRelatorio {
  inicio: string
  fim: string
  label: string
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
        name="formato-relatorio-parceiro"
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
  parceiroFixo,
  formatoInicial = 'periodo',
}: RelatorioParceiroDialogProps) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const { data: parceiros, isLoading: carregandoParceiros } = useEntidades('parceiro')
  const { data: ordens, isLoading: carregandoOrdens } = useOrdensServico()
  const { data: empresaConfig } = useEmpresaConfig()
  const [parceiroId, setParceiroId] = React.useState<string | null>(parceiroFixo?.id ?? null)
  const [formato, setFormato] = React.useState<FormatoRelatorio>(formatoInicial)
  const [tipoPeriodo, setTipoPeriodo] = React.useState<TipoPeriodo>('mensal')
  const [dataInicio, setDataInicio] = React.useState(hoje)
  const [dataFim, setDataFim] = React.useState(hoje)
  const [mes, setMes] = React.useState(hoje.slice(0, 7))
  const [ano, setAno] = React.useState(hoje.slice(0, 4))
  const [semestre, setSemestre] = React.useState<'1' | '2'>(Number(hoje.slice(5, 7)) <= 6 ? '1' : '2')
  const [servicosSelecionados, setServicosSelecionados] = React.useState<string[]>([])
  const [gerando, setGerando] = React.useState(false)

  const parceiro = parceiroFixo ?? parceiros?.find((item) => item.id === parceiroId)
  const ordensDoParceiro = React.useMemo(
    () => (ordens ?? []).filter((ordem) => ordem.entidade_id === parceiroId),
    [ordens, parceiroId],
  )
  const servicosDisponiveis = React.useMemo(() => {
    const mapa = new Map<string, string>()
    for (const ordem of ordensDoParceiro) {
      for (const item of ordem.itens) mapa.set(item.servico.id, item.servico.nome)
    }
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [ordensDoParceiro])

  const intervalo = intervaloDoPeriodo(tipoPeriodo, dataInicio, dataFim, mes, ano, semestre)
  const periodoPersonalizadoInvalido = tipoPeriodo === 'personalizado' && Boolean(
    dataInicio && dataFim &&
      (dataInicio > dataFim || differenceInCalendarDays(parseISO(dataFim), parseISO(dataInicio)) > 30),
  )
  const podeGerar = Boolean(
    parceiro &&
      !gerando &&
      (formato === 'periodo'
        ? intervalo && !periodoPersonalizadoInvalido
        : servicosSelecionados.length > 0),
  )

  function alternarServico(servicoId: string) {
    setServicosSelecionados((atuais) =>
      atuais.includes(servicoId) ? atuais.filter((id) => id !== servicoId) : [...atuais, servicoId],
    )
  }

  function alterarAbertura(aberto: boolean) {
    if (!aberto) {
      setParceiroId(parceiroFixo?.id ?? null)
      setFormato(formatoInicial)
      setServicosSelecionados([])
    }
    onOpenChange(aberto)
  }

  async function gerarRelatorio() {
    if (!parceiro || !podeGerar) return

    let ordensFiltradas: OrdemServicoComRelacoes[]
    let filtroLabel: string
    let servicoIds: string[] | undefined

    if (formato === 'periodo') {
      if (!intervalo) return
      ordensFiltradas = ordensDoParceiro.filter(
        (ordem) => ordem.data_recebimento >= intervalo.inicio && ordem.data_recebimento <= intervalo.fim,
      )
      filtroLabel = intervalo.label
    } else {
      servicoIds = servicosSelecionados
      ordensFiltradas = ordensDoParceiro.filter((ordem) =>
        ordem.itens.some((item) => servicosSelecionados.includes(item.servico.id)),
      )
      const nomes = servicosDisponiveis
        .filter((servico) => servicosSelecionados.includes(servico.id))
        .map((servico) => servico.nome)
      filtroLabel = `Serviços selecionados: ${nomes.join(', ')}`
    }

    if (ordensFiltradas.length === 0) {
      toast.warning('Nenhuma ordem de serviço encontrada para a seleção informada.')
      return
    }

    setGerando(true)
    try {
      const { baixarRelatorioParceiro } = await import('@/features/entidades/components/RelatorioFechamentoPdf')
      await baixarRelatorioParceiro(parceiro, ordensFiltradas, filtroLabel, empresaConfig, servicoIds)
      alterarAbertura(false)
    } catch {
      toast.error('Não foi possível gerar o relatório agora. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={alterarAbertura}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatório de Parceiro</DialogTitle>
          <DialogDescription>Escolha o parceiro e como deseja montar o arquivo PDF.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="parceiro-relatorio" className="text-xs font-medium text-slate-600">Parceiro</label>
            {parceiroFixo ? (
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                {parceiroFixo.nome}
              </div>
            ) : (
              <Combobox
                id="parceiro-relatorio"
                options={(parceiros ?? []).map((item) => ({ value: item.id, label: item.nome }))}
                value={parceiroId}
                onChange={(novoParceiroId) => {
                  setParceiroId(novoParceiroId)
                  setServicosSelecionados([])
                }}
                placeholder={carregandoParceiros ? 'Carregando parceiros...' : 'Selecione um parceiro'}
                searchPlaceholder="Buscar parceiro..."
                emptyMessage="Nenhum parceiro encontrado."
                disabled={carregandoParceiros}
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
              checked={formato === 'servicos'}
              onChange={() => setFormato('servicos')}
              title="Por serviços selecionados"
              description="Inclua somente os serviços marcados."
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
                      <label htmlFor="parceiro-data-inicio" className="text-xs font-medium text-slate-600">Data inicial</label>
                      <Input id="parceiro-data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="parceiro-data-fim" className="text-xs font-medium text-slate-600">Data final</label>
                      <Input id="parceiro-data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
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
                    <label htmlFor="parceiro-mes" className="text-xs font-medium text-slate-600">Mês</label>
                    <Input id="parceiro-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
                  </div>
                )}

                {(tipoPeriodo === 'semestral' || tipoPeriodo === 'anual') && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="parceiro-ano" className="text-xs font-medium text-slate-600">Ano</label>
                    <Input id="parceiro-ano" type="number" min="2000" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} />
                  </div>
                )}
                {tipoPeriodo === 'semestral' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="parceiro-semestre" className="text-xs font-medium text-slate-600">Semestre</label>
                    <select
                      id="parceiro-semestre"
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
                <p className="text-xs font-medium text-slate-600">Serviços a incluir</p>
                {servicosDisponiveis.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setServicosSelecionados(
                      servicosSelecionados.length === servicosDisponiveis.length
                        ? []
                        : servicosDisponiveis.map((servico) => servico.id),
                    )}
                    className="text-xs font-medium text-brand-700 hover:text-brand-800"
                  >
                    {servicosSelecionados.length === servicosDisponiveis.length ? 'Limpar seleção' : 'Selecionar todos'}
                  </button>
                )}
              </div>
              {!parceiroId ? (
                <p className="text-sm text-slate-400">Selecione um parceiro para listar os serviços.</p>
              ) : carregandoOrdens ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-brand-600" size={22} /></div>
              ) : servicosDisponiveis.length === 0 ? (
                <p className="text-sm text-slate-400">Este parceiro ainda não possui serviços em ordens cadastradas.</p>
              ) : (
                <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                  {servicosDisponiveis.map((servico) => (
                    <label key={servico.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={servicosSelecionados.includes(servico.id)}
                        onChange={() => alternarServico(servico.id)}
                        className="accent-brand-600"
                      />
                      {servico.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
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
