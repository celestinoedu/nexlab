import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Download, Loader2, Pencil, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useEntidade } from '@/hooks/useEntidade'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useOrdensServico } from '@/features/ordens-servico/hooks/useOrdensServico'
import { ListaOrdensServico } from '@/features/ordens-servico/components/ListaOrdensServico'
import { OrdemServicoFormDialog } from '@/features/ordens-servico/components/OrdemServicoFormDialog'
import { EntidadeFormDialog } from './components/EntidadeFormDialog'
import { TabelaPrecosDialog } from './components/TabelaPrecosDialog'
import { valorTotalOrdem, type OrdemServicoComRelacoes } from '@/types/domain'

export function EntidadeExtratoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: entidade, isLoading: carregandoEntidade } = useEntidade(id)
  const { data: ordens, isLoading: carregandoOrdens } = useOrdensServico()
  const { data: empresaConfig } = useEmpresaConfig()

  const [periodo, setPeriodo] = React.useState('todos')
  const [editarCadastroAberto, setEditarCadastroAberto] = React.useState(false)
  const [precosAberto, setPrecosAberto] = React.useState(false)
  const [ordemEditando, setOrdemEditando] = React.useState<OrdemServicoComRelacoes | null>(null)
  const [dialogOrdemAberto, setDialogOrdemAberto] = React.useState(false)

  const ordensDaEntidade = React.useMemo(
    () => (ordens ?? []).filter((o) => o.entidade_id === id),
    [ordens, id],
  )

  const periodos = React.useMemo(() => {
    const set = new Set<string>()
    for (const o of ordensDaEntidade) set.add(o.mes_referencia)
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((mes) => ({ value: mes, label: format(parseISO(mes), "MMMM 'de' yyyy", { locale: ptBR }) }))
  }, [ordensDaEntidade])

  const ordensFiltradas = React.useMemo(
    () => ordensDaEntidade.filter((o) => periodo === 'todos' || o.mes_referencia === periodo),
    [ordensDaEntidade, periodo],
  )

  const total = ordensFiltradas.reduce((acc, o) => acc + valorTotalOrdem(o), 0)

  function abrirEdicaoOrdem(ordem: OrdemServicoComRelacoes) {
    setOrdemEditando(ordem)
    setDialogOrdemAberto(true)
  }

  async function baixarPdfOs(ordem: OrdemServicoComRelacoes) {
    try {
      const { baixarPdfOrdemServico } = await import('@/features/ordens-servico/components/OrdemServicoPdf')
      await baixarPdfOrdemServico(ordem, empresaConfig)
    } catch {
      toast.error('Não foi possível gerar o PDF agora. Tente novamente.')
    }
  }

  async function baixarRelatorio() {
    if (!entidade) return
    try {
      const { baixarRelatorioFechamento } = await import('./components/RelatorioFechamentoPdf')
      const periodoLabel =
        periodo === 'todos'
          ? 'Todos os períodos'
          : format(parseISO(periodo), "MMMM 'de' yyyy", { locale: ptBR })
      await baixarRelatorioFechamento(entidade, ordensFiltradas, periodoLabel, empresaConfig)
    } catch {
      toast.error('Não foi possível gerar o relatório agora. Tente novamente.')
    }
  }

  if (carregandoEntidade) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    )
  }

  if (!entidade) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
        Cadastro não encontrado.
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate('/clientes-parceiros')}>
            Voltar para Clientes e Parceiros
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/clientes-parceiros')}
        className="flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} />
        Clientes e Parceiros
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{entidade.nome}</h1>
          <Badge variant={entidade.tipo === 'parceiro' ? 'brand' : 'neutral'}>
            {entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
          </Badge>
          {!entidade.ativo && <Badge variant="neutral">Inativo</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPrecosAberto(true)}>
            <Wallet size={16} />
            Tabela de preços
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditarCadastroAberto(true)}>
            <Pencil size={16} />
            Editar cadastro
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {[entidade.telefone, entidade.email, entidade.documento].filter(Boolean).join(' · ') ||
          'Sem dados de contato cadastrados.'}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <option value="todos">Todos os períodos</option>
          {periodos.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label.charAt(0).toUpperCase() + p.label.slice(1)}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 px-4 py-2 text-right">
            <span className="block text-xs font-medium text-brand-700">Total no período</span>
            <span className="text-lg font-semibold text-brand-900">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={baixarRelatorio}
            disabled={ordensFiltradas.length === 0}
          >
            <Download size={16} />
            Relatório (PDF)
          </Button>
        </div>
      </div>

      {carregandoOrdens ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : (
        <ListaOrdensServico
          ordens={ordensFiltradas}
          onEditOrdem={abrirEdicaoOrdem}
          onImprimirOrdem={baixarPdfOs}
        />
      )}

      <EntidadeFormDialog open={editarCadastroAberto} onOpenChange={setEditarCadastroAberto} entidade={entidade} />
      <TabelaPrecosDialog open={precosAberto} onOpenChange={setPrecosAberto} entidade={entidade} />
      <OrdemServicoFormDialog
        open={dialogOrdemAberto}
        onOpenChange={setDialogOrdemAberto}
        ordem={ordemEditando}
      />
    </div>
  )
}
