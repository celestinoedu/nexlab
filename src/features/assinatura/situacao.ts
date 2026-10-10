/**
 * Regras da mensalidade NexLab compartilhadas entre o painel da Lotus
 * (`features/admin`) e os avisos exibidos ao cliente (`AvisoAssinatura`).
 * Datas trafegam como 'AAAA-MM-DD' e o "hoje" é sempre o de Brasília, para
 * o aviso não virar de dia às 21h por causa do UTC.
 */

export type SituacaoAssinatura = 'sem_cobranca' | 'em_dia' | 'vence_em_breve' | 'atrasada'

export interface DadosVencimento {
  ativa: boolean | null
  proximo_vencimento: string | null
  dias_aviso: number | null
}

export const SITUACAO_LABEL: Record<SituacaoAssinatura, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  atrasada: { label: 'Em atraso', variant: 'danger' },
  vence_em_breve: { label: 'Vence em breve', variant: 'warning' },
  em_dia: { label: 'Em dia', variant: 'success' },
  sem_cobranca: { label: 'Sem cobrança', variant: 'neutral' },
}

export function hojeLocal(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Dias corridos de `hoje` até `data` — negativo quando a data já passou. */
export function diasAte(data: string, hoje = hojeLocal()): number {
  return Math.round((Date.parse(`${data}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000)
}

export function calcularSituacao(assinatura: DadosVencimento | null | undefined, hoje = hojeLocal()): SituacaoAssinatura {
  if (!assinatura?.ativa || !assinatura.proximo_vencimento) return 'sem_cobranca'
  const dias = diasAte(assinatura.proximo_vencimento, hoje)
  if (dias < 0) return 'atrasada'
  if (dias <= (assinatura.dias_aviso ?? 0)) return 'vence_em_breve'
  return 'em_dia'
}

/** Mesmo cálculo de `admin_registrar_pagamento` (migration 0025): mês seguinte, preservando o dia contratado. */
export function proximoVencimentoApos(vencimento: string, diaVencimento: number): string {
  const [ano, mes] = vencimento.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
  return new Date(Date.UTC(ano, mes, Math.min(diaVencimento, ultimoDia))).toISOString().slice(0, 10)
}

export function descreverPrazo(dias: number): string {
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  if (dias > 1) return `vence em ${dias} dias`
  if (dias === -1) return 'venceu ontem'
  return `venceu há ${-dias} dias`
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatarData(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${valor}T00:00:00Z`))
}

export function formatarCompetencia(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${valor}T00:00:00Z`))
}
