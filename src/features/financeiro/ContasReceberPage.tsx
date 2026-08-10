import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Loader2, CircleCheck, CircleDollarSign, Ban, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/shared/Combobox'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { useContasReceber } from './hooks/useContasReceber'
import { useContaReceberMutations } from './hooks/useContaReceberMutations'
import { MarcarPagoDialog } from './components/MarcarPagoDialog'
import { MarcarVariasPagoDialog } from './components/MarcarVariasPagoDialog'
import { CancelarContaDialog } from './components/CancelarContaDialog'
import { STATUS_CONTA_RECEBER_LABEL, type ContaReceberComRelacoes, type StatusContaReceber } from '@/types/domain'

type FiltroStatus = 'todos' | StatusContaReceber

const STATUS_BADGE_VARIANT: Record<StatusContaReceber, 'success' | 'warning' | 'danger'> = {
  aberto: 'warning',
  pago: 'success',
  cancelado: 'danger',
}

export function ContasReceberPage() {
  const { data: contas, isLoading } = useContasReceber()
  const { data: profile } = useProfile()
  const { marcarComoPago, marcarComoPendente, marcarVariasComoPago, cancelar } = useContaReceberMutations()
  const podeAdmin = profile?.role === 'admin'

  const [busca, setBusca] = React.useState('')
  const [statusFiltro, setStatusFiltro] = React.useState<FiltroStatus>('todos')
  const [mesFiltro, setMesFiltro] = React.useState('todos')
  const [entidadeFiltro, setEntidadeFiltro] = React.useState<string | null>(null)
  const [mostrarCancelados, setMostrarCancelados] = React.useState(false)
  const [contaPagar, setContaPagar] = React.useState<ContaReceberComRelacoes | null>(null)
  const [contaCancelar, setContaCancelar] = React.useState<ContaReceberComRelacoes | null>(null)
  const [selecionadas, setSelecionadas] = React.useState<Set<string>>(new Set())
  const [pagarEmMassaAberto, setPagarEmMassaAberto] = React.useState(false)

  const meses = React.useMemo(() => {
    const set = new Set<string>()
    for (const c of contas ?? []) set.add(c.mes_referencia)
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((mes) => ({ value: mes, label: format(parseISO(mes), "MMMM 'de' yyyy", { locale: ptBR }) }))
  }, [contas])

  const entidadeOptions: ComboboxOption[] = React.useMemo(() => {
    const porId = new Map<string, ComboboxOption>()
    for (const c of contas ?? []) {
      if (!porId.has(c.entidade_id)) {
        porId.set(c.entidade_id, {
          value: c.entidade_id,
          label: c.entidade.nome,
          hint: (
            <Badge variant={c.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'} className="ml-2 shrink-0">
              {c.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
            </Badge>
          ),
        })
      }
    }
    return Array.from(porId.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [contas])

  const filtradas = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (contas ?? []).filter((c) => {
      if (!mostrarCancelados && c.status === 'cancelado') return false
      if (statusFiltro !== 'todos' && c.status !== statusFiltro) return false
      if (mesFiltro !== 'todos' && c.mes_referencia !== mesFiltro) return false
      if (entidadeFiltro && c.entidade_id !== entidadeFiltro) return false
      if (!buscaLower) return true
      return (
        c.entidade.nome.toLowerCase().includes(buscaLower) ||
        (c.ordem.cliente_final ?? '').toLowerCase().includes(buscaLower) ||
        String(c.ordem.numero_os).includes(buscaLower)
      )
    })
  }, [contas, busca, statusFiltro, mesFiltro, entidadeFiltro, mostrarCancelados])

  const totalFiltrado = filtradas
    .filter((c) => c.status !== 'cancelado')
    .reduce((acc, c) => acc + c.valor, 0)

  const abertasFiltradas = filtradas.filter((c) => c.status === 'aberto')
  const todasAbertasSelecionadas =
    abertasFiltradas.length > 0 && abertasFiltradas.every((c) => selecionadas.has(c.id))

  function alternarSelecao(id: string) {
    setSelecionadas((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  function alternarSelecionarTodas() {
    setSelecionadas(todasAbertasSelecionadas ? new Set() : new Set(abertasFiltradas.map((c) => c.id)))
  }

  async function confirmarPagamento(dataPagamento: string, formaPagamento: string | null) {
    if (!contaPagar) return
    try {
      await marcarComoPago.mutateAsync({ id: contaPagar.id, dataPagamento, formaPagamento })
      toast.success('Marcada como paga.')
      setContaPagar(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  async function confirmarCancelamento(justificativa: string) {
    if (!contaCancelar) return
    try {
      await cancelar.mutateAsync({ id: contaCancelar.id, justificativa })
      toast.success('Conta cancelada.')
      setContaCancelar(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar agora.')
    }
  }

  async function confirmarPagamentoEmMassa(dataPagamento: string, formaPagamento: string | null) {
    try {
      await marcarVariasComoPago.mutateAsync({ ids: Array.from(selecionadas), dataPagamento, formaPagamento })
      toast.success(`${selecionadas.size} conta(s) marcada(s) como paga.`)
      setSelecionadas(new Set())
      setPagarEmMassaAberto(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  async function voltarParaAberto(conta: ContaReceberComRelacoes) {
    try {
      await marcarComoPendente.mutateAsync(conta.id)
      toast.success('Marcada como aberta novamente.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Contas a Receber</h1>
        <div className="rounded-xl bg-brand-50 px-4 py-2 text-right">
          <span className="block text-xs font-medium text-brand-700">Total (filtro atual)</span>
          <span className="text-lg font-semibold text-brand-900">
            {totalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente final, nº OS..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex w-full items-center gap-1.5 sm:w-64">
          <Combobox
            options={entidadeOptions}
            value={entidadeFiltro}
            onChange={setEntidadeFiltro}
            placeholder="Todos os clientes/parceiros"
            searchPlaceholder="Buscar por nome..."
            emptyMessage="Nenhum encontrado."
          />
          {entidadeFiltro && (
            <button
              type="button"
              onClick={() => setEntidadeFiltro(null)}
              className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Limpar
            </button>
          )}
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

        <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300"
            checked={mostrarCancelados}
            onChange={(e) => setMostrarCancelados(e.target.checked)}
          />
          Mostrar cancelados
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['todos', 'aberto', 'pago'] as const).map((status) => (
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
            {status === 'todos' ? 'Todos' : STATUS_CONTA_RECEBER_LABEL[status]}
          </button>
        ))}
        {mostrarCancelados && (
          <button
            onClick={() => setStatusFiltro('cancelado')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFiltro === 'cancelado'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            Cancelados
          </button>
        )}
      </div>

      {selecionadas.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-2.5">
          <span className="text-sm text-brand-800">
            {selecionadas.size} conta{selecionadas.size === 1 ? '' : 's'} selecionada
            {selecionadas.size === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelecionadas(new Set())}
              className="text-xs font-medium text-brand-700 hover:text-brand-900"
            >
              Limpar seleção
            </button>
            <Button size="sm" onClick={() => setPagarEmMassaAberto(true)}>
              <Landmark size={15} />
              Marcar como pago
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
          Nenhuma conta a receber encontrada com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  {abertasFiltradas.length > 0 && (
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300"
                      checked={todasAbertasSelecionadas}
                      onChange={alternarSelecionarTodas}
                      aria-label="Selecionar todas as abertas"
                    />
                  )}
                </th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">OS / Cliente final</th>
                <th className="px-4 py-3">Forma de pagamento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((conta) => (
                <tr key={conta.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {conta.status === 'aberto' && (
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300"
                        checked={selecionadas.has(conta.id)}
                        onChange={() => alternarSelecao(conta.id)}
                        aria-label={`Selecionar OS #${conta.ordem.numero_os}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-800">{conta.entidade.nome}</span>
                      <Badge variant={conta.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'}>
                        {conta.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    #{conta.ordem.numero_os} {conta.ordem.cliente_final ? `— ${conta.ordem.cliente_final}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{conta.forma_pagamento || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[conta.status]}>
                      {STATUS_CONTA_RECEBER_LABEL[conta.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {conta.status === 'aberto' && (
                        <button
                          type="button"
                          onClick={() => setContaPagar(conta)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-success-100 hover:text-success-700"
                          aria-label="Marcar como pago"
                          title="Marcar como pago"
                        >
                          <CircleCheck size={16} />
                        </button>
                      )}
                      {conta.status === 'pago' && (
                        <button
                          type="button"
                          onClick={() => voltarParaAberto(conta)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-warning-100 hover:text-warning-700"
                          aria-label="Marcar como pendente"
                          title="Marcar como pendente"
                        >
                          <CircleDollarSign size={16} />
                        </button>
                      )}
                      {podeAdmin && conta.status !== 'cancelado' && (
                        <button
                          type="button"
                          onClick={() => setContaCancelar(conta)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-100 hover:text-danger-700"
                          aria-label="Cancelar conta"
                          title="Cancelar conta"
                        >
                          <Ban size={16} />
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

      <MarcarPagoDialog
        open={Boolean(contaPagar)}
        onOpenChange={(open) => !open && setContaPagar(null)}
        conta={contaPagar}
        onConfirm={confirmarPagamento}
      />
      <CancelarContaDialog
        open={Boolean(contaCancelar)}
        onOpenChange={(open) => !open && setContaCancelar(null)}
        conta={contaCancelar}
        onConfirm={confirmarCancelamento}
      />
      <MarcarVariasPagoDialog
        open={pagarEmMassaAberto}
        onOpenChange={setPagarEmMassaAberto}
        quantidade={selecionadas.size}
        onConfirm={confirmarPagamentoEmMassa}
      />
    </div>
  )
}
