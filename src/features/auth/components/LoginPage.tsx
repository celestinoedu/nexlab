import * as React from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, FlaskConical, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/Logo'
import { AuthBrandPanel } from './AuthBrandPanel'

const schema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('Digite um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})

type FormValues = z.infer<typeof schema>

/** Credenciais fixas da empresa Demonstração — ver SETUP.md § "Provisionar a empresa Demonstração". */
const DEMO_EMAIL = 'teste@teste.com'
const DEMO_SENHA = 'teste123'

export function LoginPage() {
  const { session, loading, signInWithPassword } = useAuth()
  const location = useLocation()
  const [showPassword, setShowPassword] = React.useState(false)
  const [entrandoDemo, setEntrandoDemo] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (!loading && session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values: FormValues) => {
    const { error } = await signInWithPassword(values.email, values.password)
    if (error) {
      toast.error(error)
    }
  }

  async function acessarDemonstracao() {
    setEntrandoDemo(true)
    const { error } = await signInWithPassword(DEMO_EMAIL, DEMO_SENHA)
    if (error) {
      toast.error('A demonstração não está disponível neste ambiente no momento.')
      setEntrandoDemo(false)
    }
  }

  return (
    <div className="app-min-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,0.95fr)]">
      <AuthBrandPanel />
      <main className="app-min-screen relative flex items-center justify-center overflow-hidden bg-mist px-5 py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-brand-200/50" />
        <div className="relative w-full max-w-md">
          <div className="mb-10 flex justify-center lg:hidden">
            <Logo size="md" />
          </div>

          <div className="mb-7">
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">Bem-vindo</p>
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-ink">Acesse o seu laboratório</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Entre com suas credenciais para continuar no NexLab.
            </p>
          </div>

          <Card className="shadow-[0_18px_50px_rgba(23,32,51,0.08)]">
            <CardHeader className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-ink">Dados de acesso</h2>
              <p className="text-sm text-slate-500">Suas informações ficam protegidas.</p>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="voce@exemplo.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-danger-500">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-danger-500">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                Entrar no NexLab
              </Button>
              </form>
            </CardContent>
          </Card>

          <button
            type="button"
            onClick={acessarDemonstracao}
            disabled={entrandoDemo}
            className="mx-auto mt-5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-60"
          >
            {entrandoDemo ? <Loader2 className="animate-spin" size={15} /> : <FlaskConical size={15} />}
            Explorar demonstração
          </button>

          <p className="mt-7 text-center text-xs text-slate-400">
            NexLab · Gestão que conecta
          </p>
        </div>
      </main>
    </div>
  )
}
