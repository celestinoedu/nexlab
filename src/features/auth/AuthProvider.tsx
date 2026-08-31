import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true enquanto ainda não sabemos se há sessão salva (evita "piscar" tela de login) */
  loading: boolean
  passwordRecovery: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [passwordRecovery, setPasswordRecovery] = React.useState(false)
  const queryClient = useQueryClient()
  // undefined = ainda não resolvido; null = deslogado.
  const usuarioAnteriorRef = React.useRef<string | null | undefined>(undefined)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      usuarioAnteriorRef.current = data.session?.user.id ?? null
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      const novoUsuarioId = newSession?.user.id ?? null
      // Limpa todo o cache do TanStack Query sempre que o usuário logado muda
      // (login, logout, ou troca de conta no mesmo navegador) — evita
      // reaproveitar dado de outra empresa (multi-tenant) ou, na conta
      // Demonstração, dado editado só em cache numa sessão anterior (ver
      // src/lib/demoMode.ts). Refresh de token da mesma sessão não conta.
      if (novoUsuarioId !== usuarioAnteriorRef.current) {
        queryClient.clear()
        usuarioAnteriorRef.current = novoUsuarioId
      }
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [queryClient])

  const signInWithPassword = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: traduzErroLogin(error.message) }
    }
    return { error: null }
  }, [])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const requestPasswordReset = React.useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // O token do Supabase usa o fragmento da URL. Por isso o retorno cai
      // na raiz e o evento PASSWORD_RECOVERY leva à tela certa, sem disputar
      // o mesmo `#` usado pelo HashRouter do GitHub Pages.
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    })
    if (error) {
      return { error: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' }
    }
    return { error: null }
  }, [])

  const updatePassword = React.useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    })
    if (error) return { error: 'Não foi possível salvar a nova senha. Tente novamente.' }
    setPasswordRecovery(false)
    return { error: null }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      passwordRecovery,
      signInWithPassword,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [session, loading, passwordRecovery, signInWithPassword, signOut, requestPasswordReset, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de um <AuthProvider>')
  return ctx
}

/** Mensagens de erro do Supabase traduzidas para uma linguagem simples e direta. */
function traduzErroLogin(message: string): string {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Confira os dados e tente novamente.'
  }
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada.'
  }
  return 'Não foi possível entrar agora. Tente novamente em instantes.'
}
