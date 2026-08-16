import * as React from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/Logo'
import { AuthBrandPanel } from './AuthBrandPanel'

const schema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('Digite um e-mail válido'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [sent, setSent] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    const { error } = await requestPasswordReset(values.email)
    if (!error) setSent(true)
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,0.95fr)]">
      <AuthBrandPanel />
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mist px-5 py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-brand-200/50" />
        <div className="relative w-full max-w-md">
          <div className="mb-10 flex justify-center lg:hidden">
            <Logo size="md" />
          </div>
          <div className="mb-7">
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">Segurança</p>
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-ink">Recupere o seu acesso</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Enviaremos um link seguro para você criar uma nova senha.
            </p>
          </div>

          <Card className="shadow-[0_18px_50px_rgba(23,32,51,0.08)]">
            <CardHeader className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-ink">Redefinir senha</h2>
              <p className="text-sm text-slate-500">Informe o e-mail usado no NexLab.</p>
            </CardHeader>
            <CardContent className="pt-5">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
                  <MailCheck className="text-success-700" size={22} />
                </div>
                <p className="text-sm text-slate-600">
                  Enviamos um link para o seu e-mail. Abra a mensagem e siga as instruções para
                  criar uma nova senha.
                </p>
              </div>
            ) : (
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

                <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                  {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                  Enviar link
                </Button>
              </form>
            )}

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={15} />
              Voltar para o login
            </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
