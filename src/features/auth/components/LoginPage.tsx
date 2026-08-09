import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Logo } from '@/components/shared/Logo'

const emailSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('Digite um e-mail válido'),
})
type EmailValues = z.infer<typeof emailSchema>

const codeSchema = z.object({
  code: z
    .string()
    .min(1, 'Informe o código recebido por e-mail')
    .regex(/^\d{6}$/, 'O código tem 6 números'),
})
type CodeValues = z.infer<typeof codeSchema>

const REENVIO_ESPERA_SEGUNDOS = 30

export function LoginPage() {
  const { session, loading, requestLoginCode, verifyLoginCode } = useAuth()
  const location = useLocation()
  const [email, setEmail] = React.useState<string | null>(null)
  const [segundosParaReenviar, setSegundosParaReenviar] = React.useState(0)

  React.useEffect(() => {
    if (segundosParaReenviar <= 0) return
    const id = setInterval(() => setSegundosParaReenviar((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [segundosParaReenviar])

  if (!loading && session) {
    const from = (location.state as { from?: string } | null)?.from ?? '#/'
    return <Navigate to={from} replace />
  }

  const enviarCodigo = async (destino: string) => {
    const { error } = await requestLoginCode(destino)
    if (error) {
      toast.error(error)
      return false
    }
    setSegundosParaReenviar(REENVIO_ESPERA_SEGUNDOS)
    return true
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="scale-125" />
        </div>

        <Card>
          {email === null ? (
            <PassoEmail onEnviado={(v) => enviarCodigo(v).then((ok) => ok && setEmail(v))} />
          ) : (
            <PassoCodigo
              email={email}
              segundosParaReenviar={segundosParaReenviar}
              onReenviar={() => enviarCodigo(email)}
              onVoltar={() => setEmail(null)}
              onConfirmar={(codigo) => verifyLoginCode(email, codigo)}
            />
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          NexLab · Sistema de gestão do GRS Lab
        </p>
      </div>
    </div>
  )
}

function PassoEmail({ onEnviado }: { onEnviado: (email: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) })

  return (
    <>
      <CardHeader>
        <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
        <p className="text-sm text-slate-500">
          Informe seu e-mail. Vamos te enviar um código de 6 dígitos para entrar — sem senha.
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => onEnviado(v.email))}
          className="flex flex-col gap-4"
          noValidate
        >
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
            {errors.email && <p className="text-sm text-danger-500">{errors.email.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            Enviar código
          </Button>
        </form>
      </CardContent>
    </>
  )
}

function PassoCodigo({
  email,
  segundosParaReenviar,
  onReenviar,
  onVoltar,
  onConfirmar,
}: {
  email: string
  segundosParaReenviar: number
  onReenviar: () => void
  onVoltar: () => void
  onConfirmar: (codigo: string) => Promise<{ error: string | null }>
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema) })

  const onSubmit = async (values: CodeValues) => {
    const { error } = await onConfirmar(values.code)
    if (error) {
      setError('code', { message: error })
    }
  }

  return (
    <>
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success-100">
          <MailCheck className="text-success-700" size={20} />
        </div>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Digite o código</h1>
        <p className="text-sm text-slate-500">
          Enviamos um código de 6 dígitos para <span className="font-medium text-slate-700">{email}</span>.
          Abra seu e-mail e digite abaixo.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              className="text-center text-lg tracking-[0.5em]"
              {...register('code')}
            />
            {errors.code && <p className="text-sm text-danger-500">{errors.code.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            Entrar
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onVoltar}
            className="flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={15} />
            Trocar e-mail
          </button>
          <button
            type="button"
            onClick={onReenviar}
            disabled={segundosParaReenviar > 0}
            className="font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {segundosParaReenviar > 0 ? `Reenviar em ${segundosParaReenviar}s` : 'Reenviar código'}
          </button>
        </div>
      </CardContent>
    </>
  )
}
