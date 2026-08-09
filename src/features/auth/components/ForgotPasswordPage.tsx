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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="scale-125" />
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold text-slate-900">Redefinir senha</h1>
            <p className="text-sm text-slate-500">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>
          </CardHeader>
          <CardContent>
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
    </div>
  )
}
