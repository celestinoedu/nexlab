import * as React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useProfile } from '@/hooks/useProfile'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  nome_fantasia: z.string().trim().min(2, 'Informe o nome do laboratório'),
  nome_responsavel: z.string().trim().min(2, 'Informe o nome do responsável'),
  telefone: z.string().trim().min(8, 'Informe um telefone válido'),
  email: z.email('Informe um e-mail válido'),
  documento: z.string(),
  endereco: z.string(),
})

type FormValues = z.infer<typeof schema>

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: empresa, isLoading: carregandoEmpresa } = useEmpresaConfig()
  const { data: profile, isLoading: carregandoPerfil } = useProfile()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome_fantasia: '', nome_responsavel: '', telefone: '', email: '', documento: '', endereco: '' },
  })

  React.useEffect(() => {
    if (!empresa || !profile) return
    reset({
      nome_fantasia: empresa.nome_fantasia ?? '',
      nome_responsavel: profile.nome ?? '',
      telefone: empresa.telefone ?? '',
      email: empresa.email ?? user?.email ?? '',
      documento: empresa.documento ?? '',
      endereco: empresa.endereco ?? '',
    })
  }, [empresa, profile, reset, user?.email])

  if (carregandoEmpresa || carregandoPerfil) {
    return <div className="app-min-screen flex items-center justify-center bg-mist"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
  }
  if (profile?.role !== 'admin' || empresa?.onboarding_concluido) return <Navigate to="/" replace />

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.rpc('complete_my_onboarding', {
      p_nome_responsavel: values.nome_responsavel,
      p_nome_fantasia: values.nome_fantasia,
      p_telefone: values.telefone,
      p_email: values.email,
      p_endereco: values.endereco,
      p_documento: values.documento,
    })
    if (error) return toast.error('Não foi possível concluir a configuração agora. Tente novamente.')

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['empresa_config'] }),
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
    ])
    toast.success('Tudo pronto! Seu NexLab foi configurado.')
    navigate('/', { replace: true })
  }

  return (
    <main className="app-min-screen bg-mist px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-7 flex justify-center"><Logo size="md" /></div>
        <div className="mb-6 text-center">
          <p className="text-xs font-bold tracking-[0.12em] text-brand-600 uppercase">Primeiro acesso · etapa 2 de 2</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-ink">Vamos preparar seu laboratório</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">Confirme os dados abaixo. Eles identificam sua conta e também podem aparecer nos documentos gerados pelo NexLab.</p>
        </div>

        <Card className="shadow-[0_18px_50px_rgba(23,32,51,0.08)]">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2"><Building2 className="text-brand-600" size={19} /><h2 className="text-base font-semibold text-ink">Dados iniciais</h2></div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              <Field id="nome_fantasia" label="Nome do laboratório" error={errors.nome_fantasia?.message} className="sm:col-span-2"><Input id="nome_fantasia" autoFocus {...register('nome_fantasia')} /></Field>
              <Field id="nome_responsavel" label="Nome do responsável" error={errors.nome_responsavel?.message}><Input id="nome_responsavel" autoComplete="name" {...register('nome_responsavel')} /></Field>
              <Field id="telefone" label="Telefone / WhatsApp" error={errors.telefone?.message}><Input id="telefone" type="tel" autoComplete="tel" {...register('telefone')} /></Field>
              <Field id="email" label="E-mail comercial" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" {...register('email')} /></Field>
              <Field id="documento" label="CNPJ ou CPF (opcional)" error={errors.documento?.message}><Input id="documento" {...register('documento')} /></Field>
              <Field id="endereco" label="Endereço (opcional)" error={errors.endereco?.message} className="sm:col-span-2"><Input id="endereco" autoComplete="street-address" {...register('endereco')} /></Field>
              <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={15} className="text-brand-600" />Você poderá alterar esses dados depois em Configurações.</p>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" size={16} />}Salvar e começar a usar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col gap-1.5 ${className ?? ''}`}><Label htmlFor={id}>{label}</Label>{children}{error && <p className="text-sm text-danger-500">{error}</p>}</div>
}
