import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true enquanto ainda não sabemos se há sessão salva (evita "piscar" tela de login) */
  loading: boolean
  /** Envia o código de 6 dígitos para o e-mail (só funciona para e-mails já cadastrados, ver SETUP.md). */
  requestLoginCode: (email: string) => Promise<{ error: string | null }>
  /** Confirma o código recebido por e-mail e efetiva o login. */
  verifyLoginCode: (email: string, code: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
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

  const requestLoginCode = React.useCallback(async (email: string) => {
    // shouldCreateUser: false — não existe cadastro público, só usuários já
    // criados no painel Supabase (ver SETUP.md) podem pedir código.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) {
      return { error: traduzErroOtp(error.message) }
    }
    return { error: null }
  }, [])

  const verifyLoginCode = React.useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) {
      return { error: traduzErroOtp(error.message) }
    }
    return { error: null }
  }, [])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      requestLoginCode,
      verifyLoginCode,
      signOut,
    }),
    [session, loading, requestLoginCode, verifyLoginCode, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de um <AuthProvider>')
  return ctx
}

/** Mensagens de erro do Supabase traduzidas para uma linguagem simples e direta. */
function traduzErroOtp(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('signups not allowed') || msg.includes('user not found')) {
    return 'Não encontramos esse e-mail cadastrado. Confira se digitou certo ou fale com o administrador do sistema.'
  }
  if (msg.includes('token has expired') || msg.includes('expired')) {
    return 'Esse código expirou. Peça um novo código e tente de novo.'
  }
  if (msg.includes('invalid') || msg.includes('token')) {
    return 'Código incorreto. Confira os 6 dígitos e tente novamente.'
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'
  }
  return 'Não foi possível continuar agora. Tente novamente em instantes.'
}
