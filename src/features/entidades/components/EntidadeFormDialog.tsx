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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useEntidadeMutations } from '../hooks/useEntidadeMutations'
import type { Entidade, TipoEntidade } from '@/types/domain'

const schema = z.object({
  tipo: z.enum(['cliente', 'parceiro']),
  nome: z.string().min(1, 'Informe o nome'),
  documento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface EntidadeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entidade?: Entidade | null
  /** Pré-seleciona o tipo ao criar (ex.: botão "Novo Parceiro" na aba de parceiros). */
  tipoInicial?: TipoEntidade
}

export function EntidadeFormDialog({ open, onOpenChange, entidade, tipoInicial }: EntidadeFormDialogProps) {
  const isEditing = Boolean(entidade)
  const { createEntidade, updateEntidade } = useEntidadeMutations()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: tipoInicial ?? 'cliente', ativo: true },
  })

  const tipo = watch('tipo')

  React.useEffect(() => {
    if (!open) return
    if (entidade) {
      reset({
        tipo: entidade.tipo,
        nome: entidade.nome,
        documento: entidade.documento ?? '',
        telefone: entidade.telefone ?? '',
        email: entidade.email ?? '',
        endereco: entidade.endereco ?? '',
        observacoes: entidade.observacoes ?? '',
        ativo: entidade.ativo,
      })
    } else {
      reset({
        tipo: tipoInicial ?? 'cliente',
        nome: '',
        documento: '',
        telefone: '',
        email: '',
        endereco: '',
        observacoes: '',
        ativo: true,
      })
    }
  }, [open, entidade, tipoInicial, reset])

  const onSubmit = async (values: FormValues) => {
    const input = {
      tipo: values.tipo,
      nome: values.nome.trim(),
      documento: values.documento?.trim() || null,
      telefone: values.telefone?.trim() || null,
      email: values.email?.trim() || null,
      endereco: values.endereco?.trim() || null,
      observacoes: values.observacoes?.trim() || null,
      ativo: values.ativo,
    }

    try {
      if (entidade) {
        await updateEntidade.mutateAsync({ id: entidade.id, input })
        toast.success('Cadastro atualizado.')
      } else {
        await createEntidade.mutateAsync(input)
        toast.success('Cadastro criado.')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cadastro' : 'Novo Cliente ou Parceiro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Altere os dados e salve.' : 'Clientes pagam preço cheio, Parceiros recebem comissão.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['cliente', 'parceiro'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setValue('tipo', opcao)}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors',
                    tipo === opcao
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {opcao === 'cliente' ? 'Cliente' : 'Parceiro'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder={tipo === 'parceiro' ? 'Nome do laboratório parceiro' : 'Nome do consultório/dentista'}
              {...register('nome')}
            />
            {errors.nome && <p className="text-sm text-danger-500">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documento">CPF/CNPJ (opcional)</Label>
              <Input id="documento" {...register('documento')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input id="telefone" {...register('telefone')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail (opcional)</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endereco">Endereço (opcional)</Label>
            <Input id="endereco" {...register('endereco')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea id="observacoes" rows={2} {...register('observacoes')} />
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="size-4 rounded border-slate-300" {...register('ativo')} />
              Cadastro ativo (desmarque para ocultar da OS sem apagar o histórico)
            </label>
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
