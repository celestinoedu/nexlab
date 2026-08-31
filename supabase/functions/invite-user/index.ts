import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type InviteInput = {
  email?: string
  nome?: string
  role?: 'admin' | 'operador'
}

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`)
  return value
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Sessão inválida. Entre novamente.' }, 401)

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) return json({ error: 'Sessão inválida. Entre novamente.' }, 401)

    const { data: caller, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id, role, ativo')
      .eq('id', authData.user.id)
      .single()
    if (profileError || !caller || caller.role !== 'admin' || !caller.ativo) {
      return json({ error: 'Somente administradores podem convidar usuários.' }, 403)
    }

    const body = await request.json() as InviteInput
    const email = body.email?.trim().toLowerCase()
    const nome = body.nome?.trim()
    const role = body.role
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !nome || !['admin', 'operador'].includes(role ?? '')) {
      return json({ error: 'Preencha nome, e-mail e papel corretamente.' }, 400)
    }

    const appUrl = requiredEnv('NEXLAB_APP_URL').replace(/\/$/, '')
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/`,
      data: { nome, product: 'nexlab', must_change_password: true },
    })
    if (inviteError || !invited.user) {
      const duplicate = inviteError?.message.toLowerCase().includes('already')
      return json({ error: duplicate ? 'Este e-mail já está cadastrado.' : 'Não foi possível enviar o e-mail de convite.' }, 400)
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: invited.user.id,
      empresa_id: caller.empresa_id,
      nome,
      role,
      ativo: true,
    })
    if (insertError) {
      await supabase.auth.admin.deleteUser(invited.user.id)
      throw insertError
    }

    return json({ ok: true, userId: invited.user.id })
  } catch (error) {
    console.error('[invite-user]', error)
    return json({ error: 'Não foi possível concluir o convite agora.' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
