import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

type ProvisionInput = {
  empresa?: {
    nome_fantasia?: string
    documento?: string
    telefone?: string
    email?: string
  }
  responsavel?: {
    nome?: string
    email?: string
  }
}

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`)
  return value
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const expectedSecret = requiredEnv('NEXLAB_PROVISION_SECRET')
  if (!safeEqual(request.headers.get('x-provision-secret') ?? '', expectedSecret)) {
    return json({ error: 'Não autorizado.' }, 401)
  }

  const supabase = createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  let empresaId: string | null = null
  let userId: string | null = null

  try {
    const body = await request.json() as ProvisionInput
    const nomeEmpresa = body.empresa?.nome_fantasia?.trim()
    const nomeResponsavel = body.responsavel?.nome?.trim()
    const emailResponsavel = body.responsavel?.email?.trim().toLowerCase()
    if (!nomeEmpresa || !nomeResponsavel || !emailResponsavel || !/^\S+@\S+\.\S+$/.test(emailResponsavel)) {
      return json({ error: 'Informe empresa, nome e e-mail do responsável.' }, 400)
    }

    const { data: empresa, error: empresaError } = await supabase.from('empresas').insert({
      nome_fantasia: nomeEmpresa,
      documento: body.empresa?.documento?.trim() || null,
      telefone: body.empresa?.telefone?.trim() || null,
      email: body.empresa?.email?.trim().toLowerCase() || emailResponsavel,
      status_assinatura: 'ativa',
    }).select('id').single()
    if (empresaError || !empresa) throw empresaError ?? new Error('Empresa não criada.')
    empresaId = empresa.id

    const appUrl = requiredEnv('NEXLAB_APP_URL').replace(/\/$/, '')
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(emailResponsavel, {
      redirectTo: `${appUrl}/`,
      data: { nome: nomeResponsavel, product: 'nexlab', must_change_password: true },
    })
    if (inviteError || !invited.user) throw inviteError ?? new Error('Convite não criado.')
    userId = invited.user.id

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      empresa_id: empresaId,
      nome: nomeResponsavel,
      role: 'admin',
      ativo: true,
    })
    if (profileError) throw profileError

    return json({ ok: true, empresaId, userId })
  } catch (error) {
    console.error('[provision-client]', error)
    if (userId) await supabase.auth.admin.deleteUser(userId)
    if (empresaId) await supabase.from('empresas').delete().eq('id', empresaId)
    return json({ error: 'Não foi possível provisionar o cliente agora.' }, 500)
  }
})

function safeEqual(received: string, expected: string) {
  if (received.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
