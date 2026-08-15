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
import type { Profile } from '@/hooks/useProfile'

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome'),
  role: z.enum(['admin', 'operador']),
  ativo: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface EditarUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario: Profile | null
  ehVoceMesmo: boolean
}

export function EditarUsuarioDialog({ open, onOpenChange, usuario, ehVoceMesmo }: EditarUsuarioDialogProps) {
  const { atualizarUsuario } = useUsuarioMutations()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', role: 'operador', ativo: true },
  })

  const role = watch('role')

  React.useEffect(() => {
    if (open && usuario) {
      reset({ nome: usuario.nome ?? '', role: usuario.role, ativo: usuario.ativo })
    }
  }, [open, usuario, reset])

  const onSubmit = async (values: FormValues) => {
    if (!usuario) return
    try {
      await atualizarUsuario.mutateAsync({
        id: usuario.id,
        input: { nome: values.nome.trim(), role: values.role, ativo: values.ativo },
      })
      toast.success('Usuário atualizado.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Altere o nome, o papel ou desative o acesso.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="text-sm text-danger-500">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Papel</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['operador', 'admin'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  disabled={ehVoceMesmo}
                  onClick={() => setValue('role', opcao)}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    role === opcao
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {ROLE_USUARIO_LABEL[opcao as RoleUsuario]}
                </button>
              ))}
            </div>
            {ehVoceMesmo && (
              <p className="text-xs text-slate-400">Não dá pra alterar o próprio papel por aqui.</p>
            )}
          </div>

          <label
            className={cn(
              'flex items-center gap-2 text-sm text-slate-600',
              ehVoceMesmo && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="checkbox"
              disabled={ehVoceMesmo}
              className="size-4 rounded border-slate-300"
              {...register('ativo')}
            />
            Usuário ativo (desmarque para bloquear o acesso sem apagar o cadastro)
          </label>
          {ehVoceMesmo && (
            <p className="-mt-2 text-xs text-slate-400">Não dá pra desativar o próprio usuário.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
