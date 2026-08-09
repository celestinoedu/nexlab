import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const configurado = Boolean(supabaseUrl && supabaseAnonKey)

if (!configurado) {
  // eslint-disable-next-line no-console
  console.error(
    'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não encontradas. ' +
      'Copie .env.example para .env.local e preencha com os dados do seu projeto Supabase (veja SETUP.md). ' +
      'Sem isso o app carrega, mas login e dados não vão funcionar.',
  )
}

/**
 * Client único do Supabase para todo o app (Postgres + Auth + Storage).
 * `persistSession: true` mantém o usuário logado entre visitas (login fácil,
 * sem pedir senha toda hora) e `autoRefreshToken` renova o token sozinho.
 *
 * Usa uma URL placeholder quando as variáveis de ambiente ainda não foram
 * configuradas, só para o `createClient` não lançar erro e travar a tela
 * inteira em branco — as chamadas reais falharão com uma mensagem tratada
 * pelo AuthProvider até o .env.local ser preenchido (ver SETUP.md).
 */
export const supabase = createClient<Database>(
  configurado ? supabaseUrl : 'https://placeholder.supabase.co',
  configurado ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
