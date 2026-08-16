import * as React from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns'
import {
  AlertTriangle,
  Boxes,
  Clock,
  Loader2,
  UserX,
  Wallet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/AuthProvider'
import { useOrdensServico } from '@/features/ordens-servico/hooks/useOrdensServico'
import { useContasReceber } from '@/features/financeiro/hooks/useContasReceber'
import { useDespesas } from '@/features/despesas/hooks/useDespesas'
import { useEntidades } from '@/hooks/useEntidades'
import { useInsumos } from '@/features/estoque/hooks/useInsumos'
import { STATUS_OS_LABEL, type OrdemServicoComRelacoes } from '@/types/domain'

const DIAS_VENCENDO = 3
const DIAS_SEM_MOVIMENTO = 15

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function osAtivas(ordens: OrdemServicoComRelacoes[]) {
  return ordens.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado')
}

export function DashboardPage() {
  const { user } = useAuth()
  const nome = user?.email?.split('@')[0] ?? ''

  const { data: ordens, isLoading: carregandoOrdens } = useOrdensServico()
  const { data: contasReceber, isLoading: carregandoContas } = useContasReceber()
  const { data: despesas, isLoading: carregandoDespesas } = useDespesas()
  const { data: entidades, isLoading: carregandoEntidades } = useEntidades()
  const { data: insumos, isLoading: carregandoInsumos } = useInsumos()

  const carregando = carregandoOrdens || carregandoContas || carregandoDespesas || carregandoEntidades || carregandoInsumos

  const dados = React.useMemo(() => {
    const listaOrdens = ordens ?? []
    const ativas = osAtivas(listaOrdens)
    const hoje = new Date()

    const vencendo = ativas.filter((o) => {
      if (!o.data_prevista) return false
      const dias = differenceInCalendarDays(parseISO(o.data_prevista), hoje)
      return dias >= 0 && dias <= DIAS_VENCENDO
    })
    const atrasadas = ativas.filter((o) => {
      if (!o.data_prevista) return false
      return differenceInCalendarDays(parseISO(o.data_prevista), hoje) < 0
    })

    const mesAtual = format(startOfMonth(hoje), 'yyyy-MM-dd')
    const ordensDoMes = listaOrdens.filter((o) => o.mes_referencia === mesAtual)
    const entreguesMes = ordensDoMes.filter((o) => o.status === 'entregue').length
    const emProducaoMes = ordensDoMes.filter((o) => o.status === 'em_producao').length
    const prontoEntregaMes = ordensDoMes.filter((o) => o.status === 'pronto_entrega').length
    const percentualConcluido = ordensDoMes.length > 0 ? Math.round((entreguesMes / ordensDoMes.length) * 100) : 0

    const listaContas = contasReceber ?? []
    const aReceber = listaContas.filter((c) => c.status === 'aberto').reduce((acc, c) => acc + c.valor, 0)
    const recebidoMes = listaContas
      .filter((c) => c.status === 'pago' && c.data_pagamento && c.data_pagamento.startsWith(mesAtual.slice(0, 7)))
      .reduce((acc, c) => acc + c.valor, 0)
    const despesasMes = (despesas ?? [])
      .filter((d) => d.data_despesa.startsWith(mesAtual.slice(0, 7)))
      .reduce((acc, d) => acc + d.valor, 0)

    const listaInsumos = insumos ?? []
    const sinalizados = listaInsumos.filter((i) => i.sinalizar_compra)

    const ultimaOsPorEntidade = new Map<string, string>()
    for (const o of listaOrdens) {
      const data = o.data_entrega ?? o.data_recebimento
      const atual = ultimaOsPorEntidade.get(o.entidade_id)
      if (!atual || data > atual) ultimaOsPorEntidade.set(o.entidade_id, data)
    }
    const semMovimento = (entidades ?? [])
      .map((e) => {
        const ultima = ultimaOsPorEntidade.get(e.id)
        const dias = ultima ? differenceInCalendarDays(hoje, parseISO(ultima)) : null
        return { entidade: e, dias }
      })
      .filter((item) => item.dias === null || item.dias > DIAS_SEM_MOVIMENTO)
      .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999))
      .slice(0, 6)

    return {
      vencendo,
      atrasadas,
      ordensDoMes,
      entreguesMes,
      emProducaoMes,
      prontoEntregaMes,
      percentualConcluido,
      aReceber,
      recebidoMes,
      despesasMes,
      totalInsumos: listaInsumos.length,
      sinalizados,
      semMovimento,
    }
  }, [ordens, contasReceber, despesas, entidades, insumos])

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="auth-brand-panel relative overflow-hidden rounded-3xl px-6 py-7 text-white md:px-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.11em] text-brand-200 uppercase">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Visão geral
            </p>
            <h1 className="text-3xl font-bold tracking-[-0.04em]">Olá{nome ? `, ${nome}` : ''}.</h1>
            <p className="mt-2 text-sm text-brand-100">Clareza para decidir o próximo passo do laboratório.</p>
          </div>
          <span className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-100 backdrop-blur-sm">
            Atualizado hoje
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PrazoCard
          titulo="Serviços vencendo"
          descricao={`Próximos ${DIAS_VENCENDO} dias`}
          quantidade={dados.vencendo.length}
          variant="warning"
          to="/relatorios/canhotos"
        />
        <PrazoCard
          titulo="Serviços atrasados"
          descricao="Prazo já passou"
          quantidade={dados.atrasadas.length}
          variant="danger"
          to="/relatorios/canhotos"
        />

        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Estoque</p>
              <Boxes size={18} className="text-slate-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold text-slate-900">{dados.sinalizados.length}</span>
              <span className="pb-0.5 text-xs text-slate-400">sinalizado{dados.sinalizados.length === 1 ? '' : 's'} p/ compra</span>
            </div>
            <p className="text-xs text-slate-400">{dados.totalInsumos} insumo(s) cadastrado(s)</p>
            <Link to="/estoque" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Ver estoque →
            </Link>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 xl:col-span-1">
          <CardContent className="flex items-center gap-5 py-5">
            <AnelProgresso percentual={dados.percentualConcluido} />
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-sm font-medium text-slate-500">Produção no mês</p>
              <p className="text-xs text-slate-400">{dados.ordensDoMes.length} OS no mês corrente</p>
              <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                <span>
                  <strong className="text-slate-700">{dados.emProducaoMes}</strong> {STATUS_OS_LABEL.em_producao}
                </span>
                <span>
                  <strong className="text-slate-700">{dados.prontoEntregaMes}</strong> {STATUS_OS_LABEL.pronto_entrega}
                </span>
                <span>
                  <strong className="text-slate-700">{dados.entreguesMes}</strong> {STATUS_OS_LABEL.entregue}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 xl:col-span-2">
          <CardContent className="flex flex-col gap-4 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Financeiro</p>
              <Wallet size={18} className="text-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ValorFinanceiro label="A receber" valor={dados.aReceber} tom="brand" />
              <ValorFinanceiro label="Recebido no mês" valor={dados.recebidoMes} tom="success" />
              <ValorFinanceiro label="Despesas no mês" valor={dados.despesasMes} tom="danger" />
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 xl:col-span-3">
          <CardContent className="flex flex-col gap-3 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Clientes e Parceiros sem OS há mais de {DIAS_SEM_MOVIMENTO} dias
              </p>
              <UserX size={18} className="text-slate-400" />
            </div>
            {dados.semMovimento.length === 0 ? (
              <p className="text-sm text-slate-400">Todo mundo teve movimento recente. 🎉</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {dados.semMovimento.map(({ entidade, dias }) => (
                  <li key={entidade.id}>
                    <Link
                      to={`/clientes-parceiros/${entidade.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span className="truncate text-slate-700">{entidade.nome}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {dias === null ? 'sem OS' : `${dias}d`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PrazoCard({
  titulo,
  descricao,
  quantidade,
  variant,
  to,
}: {
  titulo: string
  descricao: string
  quantidade: number
  variant: 'warning' | 'danger'
  to: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{titulo}</p>
          {variant === 'danger' ? (
            <AlertTriangle size={18} className="text-danger-500" />
          ) : (
            <Clock size={18} className="text-warning-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-slate-900">{quantidade}</span>
          <Badge variant={variant}>{descricao}</Badge>
        </div>
        <Link to={to} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Ver ordens de serviço →
        </Link>
      </CardContent>
    </Card>
  )
}

function ValorFinanceiro({ label, valor, tom }: { label: string; valor: number; tom: 'brand' | 'success' | 'danger' }) {
  const cor = tom === 'brand' ? 'text-brand-800' : tom === 'success' ? 'text-success-700' : 'text-danger-700'
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${cor}`}>{formatarMoeda(valor)}</p>
    </div>
  )
}

/** Anel de progresso simples (SVG) — % de OS entregues no mês corrente sobre o total do mês. */
function AnelProgresso({ percentual }: { percentual: number }) {
  const tamanho = 76
  const espessura = 8
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const offset = circunferencia * (1 - percentual / 100)

  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="shrink-0 -rotate-90">
      <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} strokeWidth={espessura} className="stroke-slate-100" fill="none" />
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={raio}
        strokeWidth={espessura}
        className="stroke-brand-600"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-slate-800 text-[15px] font-semibold"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        {percentual}%
      </text>
    </svg>
  )
}
