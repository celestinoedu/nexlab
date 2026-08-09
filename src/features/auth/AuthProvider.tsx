import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true enquanto ainda não sabemos se há sessão salva (evita "piscar" tela de login) */
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

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
      redirectTo: `${window.location.origin}${window.location.pathname}#/redefinir-senha`,
    })
    if (error) {
      return { error: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' }
    }
    return { error: null }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithPassword,
      signOut,
      requestPasswordReset,
    }),
    [session, loading, signInWithPassword, signOut, requestPasswordReset],
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
