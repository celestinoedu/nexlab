import { supabase } from '@/lib/supabase'

const PARAMETROS_CALLBACK = ['access_token', 'refresh_token', 'error', 'error_code']

/**
 * O Supabase devolve convites e recuperações no fragmento (`#`) da URL, o
 * mesmo espaço usado pelo HashRouter. Consumimos a sessão antes de montar o
 * React e só então trocamos o fragmento pela rota correta. Sem isso, o router
 * interpreta `access_token=...` como uma página e renderiza uma tela vazia.
 */
export async function prepararCallbackAuth(): Promise<void> {
  const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const ehCallback = PARAMETROS_CALLBACK.some((parametro) => parametros.has(parametro))
  if (!ehCallback) return

  const callbackComErro = parametros.has('error') || parametros.has('error_code')
  let destino = '/login?acesso=link-invalido'

  if (!callbackComErro) {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (!error && data.session) destino = '/redefinir-senha'
    } catch {
      // O destino de erro abaixo informa o problema sem deixar a tela vazia.
    }
  }

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}#${destino}`,
  )
}
