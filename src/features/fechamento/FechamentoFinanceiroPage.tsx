import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lock, Loader2, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TotalInfo } from '@/components/shared/TotalInfo'
import { useProfile } from '@/hooks/useProfile'
import { useContasReceber } from '@/features/financeiro/hooks/useContasReceber'
import { useDespesas } from '@/features/despesas/hooks/useDespesas'
import { totalDespesasPagasNoMes } from '@/features/despesas/regras'
import {
  useFechamentosFinanceiros,
  useFecharMesFinanceiro,
  useReabrirMesFinanceiro,
} from './hooks/useFechamentosFinanceiros'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FechamentoFinanceiroPage() {
  const [mesSelecionado, setMesSelecionado] = React.useState(format(new Date(), 'yyyy-MM'))
  const { data: contas, isLoading: carregandoContas, isError: erroContas } = useContasReceber()
  const { data: despesas, isLoading: carregandoDespesas, isError: erroDespesas } = useDespesas()
  const { data: fechamentos, isLoading: carregandoFechamentos, isError: erroFechamentos } = useFechamentosFinanceiros()
  // Uma leitura com falha não pode virar "zero" nem ser gravada como fechamento.
  const erroLeitura = erroContas || erroDespesas || erroFechamentos
  const { data: profile } = useProfile()
  const fecharMes = useFecharMesFinanceiro()
  const reabrirMes = useReabrirMesFinanceiro()
  const podeAdmin = profile?.role === 'admin'

  const fechamentoExistente = fechamentos?.find((f) => f.mes_referencia.startsWith(mesSelecionado))
  const jaFechado = fechamentoExistente?.status === 'fechado'

  const totalReceitas = React.useMemo(
    () =>
      (contas ?? [])
        .filter((c) => c.status === 'pago' && c.data_pagamento?.startsWith(mesSelecionado))
        .reduce((acc, c) => acc + c.valor, 0),
    [contas, mesSelecionado],
  )

  const totalDespesas = React.useMemo(
    () => totalDespesasPagasNoMes(despesas ?? [], mesSelecionado),
    [despesas, mesSelecionado],
  )

  const receitasExibidas = jaFechado ? fechamentoExistente!.total_receitas : totalReceitas
  const despesasExibidas = jaFechado ? fechamentoExistente!.total_despesas : totalDespesas
  const resultado = receitasExibidas - despesasExibidas

  const carregando = carregandoContas || carregandoDespesas || carregandoFechamentos

  async function fechar() {
    try {
      await fecharMes.mutateAsync({
        mesReferencia: `${mesSelecionado}-01`,
        totalReceitas,
        totalDespesas,
      })
      toast.success('Mês fechado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível fechar o mês agora.')
    }
  }

  async function reabrir() {
    if (!fechamentoExistente) return
    try {
      await reabrirMes.mutateAsync(fechamentoExistente)
      toast.success('Mês reaberto. Os valores voltaram a ser calculados ao vivo.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível reabrir o mês agora.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Fechamento Financeiro</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesSelecionado}
            // Limpar o campo deixava o mês vazio e derrubava a tela com data inválida.
            onChange={(e) => e.target.value && setMesSelecionado(e.target.value)}
            aria-label="Mês do fechamento"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          />
          {jaFechado && <Badge variant="neutral">Fechado</Badge>}
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Resultado do laboratório em{' '}
        <strong>{format(parseISO(`${mesSelecionado}-01`), "MMMM 'de' yyyy", { locale: ptBR })}</strong>: soma do
        que foi efetivamente recebido (Contas a Receber pagas) menos as despesas pagas no mês.
      </p>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : erroLeitura ? (
        <div role="alert" className="rounded-xl border border-danger-100 bg-danger-100 p-6 text-sm text-danger-700">
          Não foi possível carregar todos os dados financeiros deste mês. Para evitar um fechamento com valores
          incompletos, tente novamente em alguns instantes.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <span>Recebido no mês</span>
                <TotalInfo titulo="Recebido no mês">Soma as contas pagas cuja data de pagamento pertence ao mês selecionado, independentemente do mês da OS. Contas abertas e canceladas não entram. Quando o mês está fechado, mostra o valor gravado no fechamento até que seja reaberto.</TotalInfo>
              </div>
              <p className="text-2xl font-semibold text-success-700">{formatarMoeda(receitasExibidas)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <span>Despesas pagas no mês</span>
                <TotalInfo titulo="Despesas pagas no mês">Soma as despesas com status Pago cuja data de pagamento pertence ao mês selecionado (despesas antigas, sem data de pagamento, usam a data da despesa). Despesas pendentes não entram. Quando o mês está fechado, mostra o valor gravado no fechamento até que seja reaberto.</TotalInfo>
              </div>
              <p className="text-2xl font-semibold text-danger-500">{formatarMoeda(despesasExibidas)}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-1 text-xs font-medium text-brand-700">
                <span>Resultado do mês</span>
                <TotalInfo titulo="Resultado do mês">Recebido no mês menos despesas no mês. Pode ser negativo. Em mês fechado, usa os dois valores gravados no fechamento; em mês aberto, usa os valores atuais.</TotalInfo>
              </div>
              <p className={resultado >= 0 ? 'text-2xl font-semibold text-brand-900' : 'text-2xl font-semibold text-danger-700'}>
                {formatarMoeda(resultado)}
              </p>
            </div>
          </div>

          {jaFechado ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-400">
                Fechado em{' '}
                {fechamentoExistente?.data_fechamento &&
                  format(parseISO(fechamentoExistente.data_fechamento), "dd/MM/yyyy 'às' HH:mm")}
                . Os valores ficam travados até o mês ser reaberto.
              </p>
              {podeAdmin && (
                <Button variant="secondary" size="sm" onClick={reabrir} disabled={reabrirMes.isPending}>
                  {reabrirMes.isPending ? <Loader2 className="animate-spin" size={16} /> : <LockOpen size={16} />}
                  Reabrir o mês
                </Button>
              )}
            </div>
          ) : podeAdmin ? (
            <Button className="self-start" onClick={fechar} disabled={fecharMes.isPending}>
              {fecharMes.isPending ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
              Fechar o mês
            </Button>
          ) : (
            <p className="text-xs text-slate-400">Somente administradores podem fechar o mês.</p>
          )}
        </>
      )}
    </div>
  )
}
