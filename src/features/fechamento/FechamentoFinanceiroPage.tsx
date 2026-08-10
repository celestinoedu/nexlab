import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/hooks/useProfile'
import { useContasReceber } from '@/features/financeiro/hooks/useContasReceber'
import { useDespesas } from '@/features/despesas/hooks/useDespesas'
import { useFechamentosFinanceiros, useFecharMesFinanceiro } from './hooks/useFechamentosFinanceiros'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FechamentoFinanceiroPage() {
  const [mesSelecionado, setMesSelecionado] = React.useState(format(new Date(), 'yyyy-MM'))
  const { data: contas, isLoading: carregandoContas } = useContasReceber()
  const { data: despesas, isLoading: carregandoDespesas } = useDespesas()
  const { data: fechamentos, isLoading: carregandoFechamentos } = useFechamentosFinanceiros()
  const { data: profile } = useProfile()
  const fecharMes = useFecharMesFinanceiro()
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
    () =>
      (despesas ?? [])
        .filter((d) => d.data_despesa.startsWith(mesSelecionado))
        .reduce((acc, d) => acc + d.valor, 0),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Fechamento Financeiro</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          />
          {jaFechado && <Badge variant="neutral">Fechado</Badge>}
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Resultado do laboratório em{' '}
        <strong>{format(parseISO(`${mesSelecionado}-01`), "MMMM 'de' yyyy", { locale: ptBR })}</strong>: soma do
        que foi efetivamente recebido (Contas a Receber pagas) menos as despesas lançadas no mês.
      </p>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-medium text-slate-400">Recebido no mês</span>
              <p className="text-2xl font-semibold text-success-700">{formatarMoeda(receitasExibidas)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-medium text-slate-400">Despesas no mês</span>
              <p className="text-2xl font-semibold text-danger-500">{formatarMoeda(despesasExibidas)}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <span className="text-xs font-medium text-brand-700">Resultado do mês</span>
              <p className={resultado >= 0 ? 'text-2xl font-semibold text-brand-900' : 'text-2xl font-semibold text-danger-700'}>
                {formatarMoeda(resultado)}
              </p>
            </div>
          </div>

          {jaFechado ? (
            <p className="text-xs text-slate-400">
              Fechado em{' '}
              {fechamentoExistente?.data_fechamento &&
                format(parseISO(fechamentoExistente.data_fechamento), "dd/MM/yyyy 'às' HH:mm")}
              . Os valores acima ficam travados mesmo que novas contas/despesas sejam lançadas depois — para
              refletir mudanças, é preciso fechar o mês de novo.
            </p>
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
