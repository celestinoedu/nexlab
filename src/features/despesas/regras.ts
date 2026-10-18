import { addMonths, format, getDaysInMonth, parseISO } from 'date-fns'
import type { Despesa } from '@/types/domain'

/** Mês (yyyy-MM) em que a despesa é controlada: o da data de referência/vencimento. */
export function mesDaDespesa(despesa: Pick<Despesa, 'data_despesa'>) {
  return despesa.data_despesa.slice(0, 7)
}

/** Dia em que o dinheiro saiu. Despesas antigas, sem data de pagamento, usam a data da despesa. */
export function dataSaidaCaixa(despesa: Pick<Despesa, 'data_despesa' | 'data_pagamento'>) {
  return despesa.data_pagamento ?? despesa.data_despesa
}

/**
 * Regra única de "despesa que saiu do caixa no mês", usada pelo Fechamento
 * Financeiro e pelo Dashboard: só despesas pagas, pelo mês do pagamento.
 */
export function despesaPagaNoMes(despesa: Despesa, mes: string) {
  return despesa.status === 'pago' && dataSaidaCaixa(despesa).startsWith(mes)
}

export function totalDespesasPagasNoMes(despesas: Despesa[], mes: string) {
  return despesas.filter((d) => despesaPagaNoMes(d, mes)).reduce((acc, d) => acc + d.valor, 0)
}

export function mesAnterior(mes: string) {
  return format(addMonths(parseISO(`${mes}-01`), -1), 'yyyy-MM')
}

export function mesSeguinte(mes: string) {
  return format(addMonths(parseISO(`${mes}-01`), 1), 'yyyy-MM')
}

/** Mesmo dia em outro mês, limitado ao último dia (31/01 → 28/02). */
export function mesmoDiaNoMes(data: string, mes: string) {
  const dia = Number(data.slice(8, 10))
  const ultimo = getDaysInMonth(parseISO(`${mes}-01`))
  return `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

function chaveRepeticao(d: Pick<Despesa, 'descricao' | 'categoria'>) {
  return `${d.descricao.trim().toLowerCase()}|${(d.categoria ?? '').trim().toLowerCase()}`
}

/**
 * Despesas fixas do mês anterior que ainda não foram lançadas no mês
 * informado (mesma descrição e subcategoria) — base do botão "Lançar fixas".
 */
export function fixasParaRepetir(despesas: Despesa[], mes: string) {
  const anterior = mesAnterior(mes)
  const jaLancadas = new Set(despesas.filter((d) => mesDaDespesa(d) === mes).map(chaveRepeticao))
  const vistas = new Set<string>()
  return despesas.filter((d) => {
    if (d.tipo !== 'fixa' || mesDaDespesa(d) !== anterior) return false
    const chave = chaveRepeticao(d)
    if (jaLancadas.has(chave) || vistas.has(chave)) return false
    vistas.add(chave)
    return true
  })
}
