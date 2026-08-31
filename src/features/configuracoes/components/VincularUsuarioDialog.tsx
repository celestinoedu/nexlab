import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useUsuarioMutations } from '../hooks/useUsuarioMutations'
import { ROLE_USUARIO_LABEL, type RoleUsuario } from '@/types/domain'

const schema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('Digite um e-mail válido'),
  nome: z.string().min(1, 'Informe o nome'),
  role: z.enum(['admin', 'operador']),
})

type FormValues = z.infer<typeof schema>

interface VincularUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Cria o acesso por uma Edge Function autenticada e envia o convite. A chave
 * privilegiada fica somente nos secrets do Supabase, nunca no navegador.
 */
export function VincularUsuarioDialog({ open, onOpenChange }: VincularUsuarioDialogProps) {
  const { convidarUsuario } = useUsuarioMutations()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', nome: '', role: 'operador' },
  })

  const role = watch('role')

  React.useEffect(() => {
    if (open) reset({ email: '', nome: '', role: 'operador' })
  }, [open, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await convidarUsuario.mutateAsync({ email: values.email.trim().toLowerCase(), nome: values.nome.trim(), role: values.role })
      toast.success('Convite enviado com o kit de boas-vindas.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            A pessoa receberá por e-mail o acesso e um passo a passo para começar a usar o NexLab.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="pessoa@laboratorio.com.br" {...register('email')} />
            {errors.email && <p className="text-sm text-danger-500">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" placeholder="Nome da pessoa" {...register('nome')} />
            {errors.nome && <p className="text-sm text-danger-500">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Papel</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['operador', 'admin'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setValue('role', opcao)}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors',
                    role === opcao
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {ROLE_USUARIO_LABEL[opcao as RoleUsuario]}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Administrador edita preços/comissões, cancela contas a receber e fecha o mês. Operador usa o
              dia a dia normalmente, sem esses acessos.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
