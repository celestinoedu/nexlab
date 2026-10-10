import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { contarParcelasEmAberto, hojeLocal, mp, requiredEnv } from '../_shared/mercadopago.ts'

// Chamada pelo app (usuário logado) para:
//  - pagar: gera o link do Checkout Pro com as mensalidades em aberto;
//  - ativar_debito: gera o link para cadastrar o cartão no débito automático;
//  - cancelar_debito: encerra o débito automático.
// Quem dá baixa é sempre o webhook, depois de o Mercado Pago confirmar.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Acao = 'pagar' | 'ativar_debito' | 'cancelar_debito'

class ErroCliente extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) throw new ErroCliente('Sessão inválida. Entre novamente.', 401)

    const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user?.email) throw new ErroCliente('Sessão inválida. Entre novamente.', 401)
    const user = authData.user

    const { data: perfil } = await supabase.from('profiles').select('empresa_id, role, ativo').eq('id', user.id).single()
    if (!perfil?.ativo) throw new ErroCliente('Usuário sem acesso ao NexLab.', 403)

    const { data: empresa } = await supabase.from('empresas').select('id, nome_fantasia, is_demo').eq('id', perfil.empresa_id).single()
    if (!empresa || empresa.is_demo) throw new ErroCliente('Pagamento indisponível nesta conta.', 403)

    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('valor_mensal, proximo_vencimento, dia_vencimento, ativa, mp_preapproval_id, mp_preapproval_status')
      .eq('empresa_id', empresa.id)
      .maybeSingle()
    if (!assinatura?.ativa) throw new ErroCliente('Não há mensalidade ativa para esta empresa.')

    const { acao } = await request.json() as { acao?: Acao }
    const appUrl = requiredEnv('NEXLAB_APP_URL').replace(/\/$/, '')
    const valor = Number(assinatura.valor_mensal)
    if (!(valor > 0)) throw new ErroCliente('A mensalidade ainda não tem valor definido. Fale com a Lotus.')

    if (acao === 'pagar') {
      const parcelas = contarParcelasEmAberto(assinatura.proximo_vencimento, assinatura.dia_vencimento)
      const competencia = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${assinatura.proximo_vencimento}T00:00:00Z`))
      const preferencia = await mp<{ init_point: string }>('/checkout/preferences', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: {
          items: [{
            id: 'nexlab-mensalidade',
            title: parcelas > 1 ? `NexLab — ${parcelas} mensalidades em aberto` : `NexLab — mensalidade de ${competencia}`,
            description: empresa.nome_fantasia,
            quantity: parcelas,
            unit_price: valor,
            currency_id: 'BRL',
          }],
          payer: { email: user.email },
          // Formato lido pelo webhook: nexlab:<empresa_id>:<parcelas>
          external_reference: `nexlab:${empresa.id}:${parcelas}`,
          back_urls: {
            success: `${appUrl}/#/meu-perfil?pagamento=aprovado`,
            pending: `${appUrl}/#/meu-perfil?pagamento=pendente`,
            failure: `${appUrl}/#/meu-perfil?pagamento=falhou`,
          },
          auto_return: 'approved',
          statement_descriptor: 'NEXLAB',
        },
      })
      return json({ url: preferencia.init_point })
    }

    if (acao === 'ativar_debito' || acao === 'cancelar_debito') {
      if (perfil.role !== 'admin') throw new ErroCliente('Somente o administrador da conta pode alterar o débito automático.', 403)
    }

    if (acao === 'ativar_debito') {
      if (assinatura.mp_preapproval_status === 'authorized') throw new ErroCliente('O débito automático já está ativo.', 409)
      // Uma tentativa anterior não concluída é descartada antes de abrir outra.
      if (assinatura.mp_preapproval_id && assinatura.mp_preapproval_status === 'pending') {
        await mp(`/preapproval/${assinatura.mp_preapproval_id}`, { method: 'PUT', body: { status: 'cancelled' } }).catch(() => {})
      }
      // Em dia: a primeira cobrança cai no próximo vencimento. Em atraso: cobra já.
      const inicio = assinatura.proximo_vencimento > hojeLocal() ? `${assinatura.proximo_vencimento}T12:00:00.000-03:00` : undefined
      const preapproval = await mp<{ id: string; init_point: string; status: string }>('/preapproval', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: {
          reason: `NexLab — mensalidade ${empresa.nome_fantasia}`.slice(0, 120),
          external_reference: `nexlab-assinatura:${empresa.id}`,
          payer_email: user.email,
          back_url: `${appUrl}/#/meu-perfil?debito=retorno`,
          status: 'pending',
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: valor,
            currency_id: 'BRL',
            ...(inicio ? { start_date: inicio } : {}),
          },
        },
      })
      const { error } = await supabase.from('assinaturas')
        .update({ mp_preapproval_id: preapproval.id, mp_preapproval_status: preapproval.status ?? 'pending' })
        .eq('empresa_id', empresa.id)
      if (error) throw error
      return json({ url: preapproval.init_point })
    }

    if (acao === 'cancelar_debito') {
      if (!assinatura.mp_preapproval_id) throw new ErroCliente('Não há débito automático para cancelar.')
      await mp(`/preapproval/${assinatura.mp_preapproval_id}`, { method: 'PUT', body: { status: 'cancelled' } })
      const { error } = await supabase.from('assinaturas').update({ mp_preapproval_status: 'cancelled' }).eq('empresa_id', empresa.id)
      if (error) throw error
      return json({ ok: true })
    }

    throw new ErroCliente('Ação inválida.')
  } catch (error) {
    if (error instanceof ErroCliente) return json({ error: error.message }, error.status)
    console.error('[mercadopago-pagamento]', error)
    return json({ error: 'Não foi possível falar com o Mercado Pago agora. Tente novamente em instantes.' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
