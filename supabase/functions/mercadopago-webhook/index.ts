import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { hojeLocal, mp, requiredEnv } from '../_shared/mercadopago.ts'

// Recebe as notificações do Mercado Pago (configuradas em "Suas integrações
// → Webhooks"). Publicada SEM verificação de JWT, porque quem chama é o
// Mercado Pago; a autenticidade vem da assinatura x-signature e de sempre
// reconsultar o pagamento na API com o nosso Access Token — o corpo da
// notificação nunca é usado como fonte do valor ou do status.
//
// Eventos tratados: payment, subscription_preapproval,
// subscription_authorized_payment. Pagamentos de outros produtos da Lotus
// na mesma conta são ignorados (external_reference sem prefixo nexlab).

type Pagamento = {
  id: number
  status: string
  transaction_amount: number
  external_reference: string | null
  date_approved: string | null
  payment_type_id: string | null
  metadata?: { preapproval_id?: string } | null
  point_of_interaction?: { transaction_data?: { subscription_id?: string } } | null
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const REF_CHECKOUT = new RegExp(`^nexlab:(${UUID}):(\\d{1,2})$`, 'i')
const REF_ASSINATURA = new RegExp(`^nexlab-assinatura:(${UUID})$`, 'i')

const FORMA: Record<string, string> = {
  bank_transfer: 'pix',
  credit_card: 'cartao_credito',
  debit_card: 'cartao_debito',
  prepaid_card: 'cartao_debito',
  ticket: 'boleto',
  account_money: 'saldo_mercadopago',
}

const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('ok')

  const url = new URL(request.url)
  const body = await request.json().catch(() => ({})) as { type?: string; topic?: string; data?: { id?: string | number } }
  const tipo = body.type ?? url.searchParams.get('type') ?? body.topic ?? url.searchParams.get('topic') ?? ''
  const id = String(url.searchParams.get('data.id') ?? body.data?.id ?? url.searchParams.get('id') ?? '')

  if (!(await assinaturaValida(request, id))) {
    console.warn('[mercadopago-webhook] assinatura inválida', { tipo, id })
    return new Response('assinatura inválida', { status: 401 })
  }
  if (!id) return new Response('ok')

  try {
    if (tipo === 'payment') {
      await processarPagamento(await mp<Pagamento>(`/v1/payments/${encodeURIComponent(id)}`))
    } else if (tipo === 'subscription_authorized_payment') {
      const cobranca = await mp<{ preapproval_id: string; payment?: { id?: number } }>(`/authorized_payments/${encodeURIComponent(id)}`)
      if (cobranca.payment?.id) {
        await processarPagamento(await mp<Pagamento>(`/v1/payments/${cobranca.payment.id}`), cobranca.preapproval_id)
      }
    } else if (tipo === 'subscription_preapproval') {
      const preapproval = await mp<{ id: string; status: string; external_reference?: string }>(`/preapproval/${encodeURIComponent(id)}`)
      const { error } = await supabase.from('assinaturas').update({ mp_preapproval_status: preapproval.status }).eq('mp_preapproval_id', preapproval.id)
      if (error) throw error
    }
    return new Response('ok')
  } catch (error) {
    // 500 faz o Mercado Pago reenviar a notificação mais tarde.
    console.error('[mercadopago-webhook]', { tipo, id }, error)
    return new Response('erro', { status: 500 })
  }
})

async function processarPagamento(pagamento: Pagamento, preapprovalId?: string) {
  if (pagamento.status !== 'approved') return

  const referencia = pagamento.external_reference ?? ''
  let empresaId: string | null = null
  let parcelas = 1

  const checkout = referencia.match(REF_CHECKOUT)
  const assinatura = referencia.match(REF_ASSINATURA)
  if (checkout) {
    empresaId = checkout[1]
    parcelas = Number(checkout[2])
  } else if (assinatura) {
    empresaId = assinatura[1]
  } else {
    const idAssinatura = preapprovalId ?? pagamento.metadata?.preapproval_id ?? pagamento.point_of_interaction?.transaction_data?.subscription_id
    if (idAssinatura) {
      const { data } = await supabase.from('assinaturas').select('empresa_id').eq('mp_preapproval_id', idAssinatura).maybeSingle()
      empresaId = data?.empresa_id ?? null
    }
  }
  if (!empresaId) return // pagamento de outro produto da Lotus

  const { data: processado, error } = await supabase.rpc('registrar_pagamento_mercadopago', {
    p_empresa_id: empresaId,
    p_mp_payment_id: String(pagamento.id),
    p_valor_total: pagamento.transaction_amount,
    p_parcelas: parcelas,
    p_data_pagamento: pagamento.date_approved ? hojeLocal(new Date(pagamento.date_approved)) : hojeLocal(),
    p_forma_pagamento: FORMA[pagamento.payment_type_id ?? ''] ?? pagamento.payment_type_id,
  })
  if (error) throw error
  console.log('[mercadopago-webhook] pagamento', pagamento.id, processado ? 'baixado' : 'já processado', { empresaId, parcelas })
}

/**
 * Valida o cabeçalho x-signature ("ts=...,v1=...") com a assinatura secreta
 * do painel de Webhooks: HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
 */
async function assinaturaValida(request: Request, dataId: string): Promise<boolean> {
  const segredo = requiredEnv('MP_WEBHOOK_SECRET')
  const cabecalho = request.headers.get('x-signature') ?? ''
  const requestId = request.headers.get('x-request-id') ?? ''
  const partes = Object.fromEntries(cabecalho.split(',').map((parte) => parte.trim().split('=') as [string, string]))
  if (!partes.ts || !partes.v1) return false

  let manifesto = ''
  if (dataId) manifesto += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`
  if (requestId) manifesto += `request-id:${requestId};`
  manifesto += `ts:${partes.ts};`

  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto)))
  const esperado = Array.from(assinatura, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return comparar(esperado, partes.v1.toLowerCase())
}

function comparar(a: string, b: string) {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}
