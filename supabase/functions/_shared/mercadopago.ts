// Acesso à API do Mercado Pago compartilhado entre `mercadopago-pagamento`
// e `mercadopago-webhook`. O Access Token fica só nos secrets do Supabase.

const MP_API = 'https://api.mercadopago.com'

export const requiredEnv = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`)
  return value
}

export async function mp<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const response = await fetch(`${MP_API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${requiredEnv('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      ...(init.idempotencyKey ? { 'X-Idempotency-Key': init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Mercado Pago ${init.method ?? 'GET'} ${path} → ${response.status}: ${text.slice(0, 500)}`)
  return (text ? JSON.parse(text) : null) as T
}

/** "Hoje" em Brasília, como 'AAAA-MM-DD'. */
export function hojeLocal(data = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data)
}

/** Mesmo cálculo de `quitar_mensalidade` (migration 0026) e de `src/features/assinatura/situacao.ts`. */
export function proximoVencimentoApos(vencimento: string, diaVencimento: number): string {
  const [ano, mes] = vencimento.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
  return new Date(Date.UTC(ano, mes, Math.min(diaVencimento, ultimoDia))).toISOString().slice(0, 10)
}

/** Quantas mensalidades estão em aberto: a atual mais as seguintes que já venceram (máx. 12). */
export function contarParcelasEmAberto(proximoVencimento: string, diaVencimento: number, hoje = hojeLocal()): number {
  let parcelas = 1
  let vencimento = proximoVencimentoApos(proximoVencimento, diaVencimento)
  while (vencimento <= hoje && parcelas < 12) {
    parcelas++
    vencimento = proximoVencimentoApos(vencimento, diaVencimento)
  }
  return parcelas
}
