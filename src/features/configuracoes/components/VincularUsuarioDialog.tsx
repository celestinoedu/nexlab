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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  id: z.string().regex(UUID_REGEX, 'Cole o UUID exatamente como aparece no Supabase'),
  nome: z.string().min(1, 'Informe o nome'),
  role: z.enum(['admin', 'operador']),
})

type FormValues = z.infer<typeof schema>

interface VincularUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Finaliza" o cadastro de alguém que já foi criado no painel do Supabase
 * (Authentication → Users) — substitui o passo manual de SQL do SETUP.md.
 * Não cria o acesso em si (e-mail/senha): isso continua exigindo o painel do
 * Supabase, porque criar um usuário de verdade precisa da chave `service_role`,
 * que nunca pode ir para o navegador (ver CLAUDE.md § restrições).
 */
export function VincularUsuarioDialog({ open, onOpenChange }: VincularUsuarioDialogProps) {
  const { vincularUsuario } = useUsuarioMutations()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { id: '', nome: '', role: 'operador' },
  })

  const role = watch('role')

  React.useEffect(() => {
    if (open) reset({ id: '', nome: '', role: 'operador' })
  }, [open, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await vincularUsuario.mutateAsync({ id: values.id.trim(), nome: values.nome.trim(), role: values.role })
      toast.success('Usuário vinculado.')
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
            1. Crie o acesso em{' '}
            <span className="font-medium text-slate-600">Supabase → Authentication → Users → Add user</span>{' '}
            (e-mail e senha). 2. Copie o UUID gerado e cole abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="id">UUID do usuário (Supabase)</Label>
            <Input id="id" placeholder="ex.: 3fa85f64-5717-4562-b3fc-2c963f66afa6" {...register('id')} />
            {errors.id && <p className="text-sm text-danger-500">{errors.id.message}</p>}
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
              Vincular usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
