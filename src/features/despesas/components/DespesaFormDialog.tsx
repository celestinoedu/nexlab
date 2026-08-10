import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
import { useDespesaMutations } from '../hooks/useDespesaMutations'
import type { Despesa } from '@/types/domain'

const schema = z.object({
  categoria: z.string().optional(),
  descricao: z.string().min(1, 'Informe a descrição'),
  valor: z.number({ message: 'Informe o valor' }).min(0, 'O valor não pode ser negativo'),
  data_despesa: z.string().min(1, 'Informe a data'),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DespesaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  despesa?: Despesa | null
}

export function DespesaFormDialog({ open, onOpenChange, despesa }: DespesaFormDialogProps) {
  const isEditing = Boolean(despesa)
  const { createDespesa, updateDespesa } = useDespesaMutations()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  React.useEffect(() => {
    if (!open) return
    if (despesa) {
      reset({
        categoria: despesa.categoria ?? '',
        descricao: despesa.descricao,
        valor: despesa.valor,
        data_despesa: despesa.data_despesa,
        observacoes: despesa.observacoes ?? '',
      })
    } else {
      reset({
        categoria: '',
        descricao: '',
        valor: 0,
        data_despesa: format(new Date(), 'yyyy-MM-dd'),
        observacoes: '',
      })
    }
  }, [open, despesa, reset])

  const onSubmit = async (values: FormValues) => {
    const input = {
      categoria: values.categoria?.trim() || null,
      descricao: values.descricao.trim(),
      valor: values.valor,
      data_despesa: values.data_despesa,
      observacoes: values.observacoes?.trim() || null,
    }

    try {
      if (despesa) {
        await updateDespesa.mutateAsync({ id: despesa.id, input })
        toast.success('Despesa atualizada.')
      } else {
        await createDespesa.mutateAsync(input)
        toast.success('Despesa lançada.')
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
          <DialogTitle>{isEditing ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
          <DialogDescription>Registre uma saída de caixa do laboratório.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" placeholder="Ex.: Compra de resina" {...register('descricao')} />
            {errors.descricao && <p className="text-sm text-danger-500">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Categoria (opcional)</Label>
              <Input id="categoria" placeholder="Ex.: Material, Aluguel, Salários" {...register('categoria')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data_despesa">Data</Label>
              <Input id="data_despesa" type="date" {...register('data_despesa')} />
              {errors.data_despesa && (
                <p className="text-sm text-danger-500">{errors.data_despesa.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min={0}
              {...register('valor', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
            />
            {errors.valor && <p className="text-sm text-danger-500">{errors.valor.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea id="observacoes" rows={2} {...register('observacoes')} />
          </div>

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
