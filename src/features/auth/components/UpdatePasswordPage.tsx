import * as React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/shared/Logo'
import { AuthBrandPanel } from './AuthBrandPanel'

const schema = z.object({
  password: z.string().min(8, 'Use pelo menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Repita a nova senha'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'As senhas precisam ser iguais',
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

export function UpdatePasswordPage() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = React.useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  if (loading) {
    return (
      <div className="app-min-screen flex items-center justify-center bg-mist">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />

  const firstAccess = session.user.user_metadata.must_change_password === true
  const onSubmit = async (values: FormValues) => {
    const { error } = await updatePassword(values.password)
    if (error) return toast.error(error)
    toast.success(firstAccess ? 'Senha criada. Boas-vindas ao NexLab!' : 'Senha atualizada com sucesso.')
    navigate('/', { replace: true })
  }

  return (
    <div className="app-min-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,0.95fr)]">
      <AuthBrandPanel />
      <main className="app-min-screen flex items-center justify-center bg-mist px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden"><Logo size="md" /></div>
          <p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">
            {firstAccess ? 'Primeiro acesso' : 'Segurança'}
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-ink">
            {firstAccess ? 'Crie a sua senha' : 'Escolha uma nova senha'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {firstAccess
              ? 'Antes de entrar, defina uma senha pessoal que só você conhece.'
              : 'A nova senha passa a valer imediatamente em todos os seus dispositivos.'}
          </p>

          <Card className="mt-7 shadow-[0_18px_50px_rgba(23,32,51,0.08)]">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-brand-600" size={19} />
                <h2 className="text-base font-semibold text-ink">Nova senha</h2>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                <input
                  className="sr-only"
                  type="email"
                  name="username"
                  autoComplete="username"
                  value={session.user.email ?? ''}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pr-10" autoFocus {...register('password')} />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-danger-500">{errors.password.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword">Repita a senha</Label>
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('confirmPassword')} />
                  {errors.confirmPassword && <p className="text-sm text-danger-500">{errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                  {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                  Salvar senha e entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
