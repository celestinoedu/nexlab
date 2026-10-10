/**
 * Regras da mensalidade NexLab compartilhadas entre o painel da Lotus
 * (`features/admin`) e os avisos exibidos ao cliente (`AvisoAssinatura`).
 * Datas trafegam como 'AAAA-MM-DD' e o "hoje" é sempre o de Brasília, para
 * o aviso não virar de dia às 21h por causa do UTC.
 */

/** Âncora do card de pagamento em Meu Perfil (botões "Pagar" rolam até ele). */
export const ID_PAGAR_MENSALIDADE = 'pagar-mensalidade'

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

export interface Bloqueio {
  bloqueada: boolean
  /** Dias até o bloqueio quando já está em atraso mas ainda dentro da tolerância. */
  diasParaBloquear: number | null
  /** Primeiro dia sem acesso, se a mensalidade continuar em aberto. */
  bloqueiaEm: string | null
}

/** Mesma regra de `public.empresa_bloqueada` (migration 0027): bloqueia quando hoje > vencimento + tolerância. */
export function calcularBloqueio(
  assinatura: (DadosVencimento & { dias_tolerancia: number | null }) | null | undefined,
  hoje = hojeLocal(),
): Bloqueio {
  if (!assinatura?.ativa || !assinatura.proximo_vencimento) return { bloqueada: false, diasParaBloquear: null, bloqueiaEm: null }
  const tolerancia = assinatura.dias_tolerancia ?? 5
  const atraso = -diasAte(assinatura.proximo_vencimento, hoje)
  const [ano, mes, dia] = assinatura.proximo_vencimento.split('-').map(Number)
  const bloqueiaEm = new Date(Date.UTC(ano, mes - 1, dia + tolerancia + 1)).toISOString().slice(0, 10)
  if (atraso > tolerancia) return { bloqueada: true, diasParaBloquear: null, bloqueiaEm }
  return { bloqueada: false, diasParaBloquear: atraso > 0 ? tolerancia + 1 - atraso : null, bloqueiaEm }
}

export interface ParcelaEmAberto {
  vencimento: string
  competencia: string
  atrasada: boolean
}

/**
 * Mensalidades ainda não pagas: sempre o vencimento atual e, quando o atraso
 * passa de um mês, também os vencimentos seguintes que já chegaram. Cada
 * "Registrar pagamento" no painel quita a mais antiga.
 */
export function parcelasEmAberto(
  assinatura: (DadosVencimento & { dia_vencimento: number | null }) | null | undefined,
  hoje = hojeLocal(),
): ParcelaEmAberto[] {
  if (!assinatura?.ativa || !assinatura.proximo_vencimento) return []
  const dia = assinatura.dia_vencimento ?? Number(assinatura.proximo_vencimento.slice(8, 10))
  const parcelas: ParcelaEmAberto[] = []
  let vencimento = assinatura.proximo_vencimento
  do {
    parcelas.push({ vencimento, competencia: `${vencimento.slice(0, 8)}01`, atrasada: vencimento < hoje })
    vencimento = proximoVencimentoApos(vencimento, dia)
  } while (vencimento <= hoje && parcelas.length < 12)
  return parcelas
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
