import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { useInsumoMutations } from '../hooks/useInsumoMutations'
import type { Insumo } from '@/types/domain'

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome do insumo'),
  categoria: z.string().optional(),
  quantidade: z.number({ message: 'Informe a quantidade' }).min(0, 'A quantidade não pode ser negativa'),
  unidade: z.string().optional(),
  valor_unitario: z.number({ message: 'Informe o valor' }).min(0, 'O valor não pode ser negativo'),
  local_estoque: z.string().optional(),
  sinalizar_compra: z.boolean(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface InsumoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insumo?: Insumo | null
}

export function InsumoFormDialog({ open, onOpenChange, insumo }: InsumoFormDialogProps) {
  const isEditing = Boolean(insumo)
  const { createInsumo, updateInsumo } = useInsumoMutations()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  React.useEffect(() => {
    if (!open) return
    if (insumo) {
      reset({
        nome: insumo.nome,
        categoria: insumo.categoria ?? '',
        quantidade: insumo.quantidade,
        unidade: insumo.unidade ?? '',
        valor_unitario: insumo.valor_unitario,
        local_estoque: insumo.local_estoque ?? '',
        sinalizar_compra: insumo.sinalizar_compra,
        observacoes: insumo.observacoes ?? '',
      })
    } else {
      reset({
        nome: '',
        categoria: '',
        quantidade: 0,
        unidade: '',
        valor_unitario: 0,
        local_estoque: '',
        sinalizar_compra: false,
        observacoes: '',
      })
    }
  }, [open, insumo, reset])

  const onSubmit = async (values: FormValues) => {
    const input = {
      nome: values.nome.trim(),
      categoria: values.categoria?.trim() || null,
      quantidade: values.quantidade,
      unidade: values.unidade?.trim() || null,
      valor_unitario: values.valor_unitario,
      local_estoque: values.local_estoque?.trim() || null,
      sinalizar_compra: values.sinalizar_compra,
      observacoes: values.observacoes?.trim() || null,
    }

    try {
      if (insumo) {
        await updateInsumo.mutateAsync({ id: insumo.id, input })
        toast.success('Insumo atualizado.')
      } else {
        await createInsumo.mutateAsync(input)
        toast.success('Insumo cadastrado.')
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
          <DialogTitle>{isEditing ? 'Editar insumo' : 'Novo insumo'}</DialogTitle>
          <DialogDescription>Cadastro simples de Estoque — quantidade, valor e onde o item fica guardado.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome do insumo</Label>
            <Input id="nome" placeholder="Ex.: Resina acrílica incolor" {...register('nome')} />
            {errors.nome && <p className="text-sm text-danger-500">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Categoria (opcional)</Label>
              <Input id="categoria" placeholder="Ex.: Resinas, Gessos, Fios" {...register('categoria')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="local_estoque">Local do estoque (opcional)</Label>
              <Input id="local_estoque" placeholder="Ex.: Armário 1 — Prateleira A" {...register('local_estoque')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min={0}
                {...register('quantidade', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              />
              {errors.quantidade && <p className="text-sm text-danger-500">{errors.quantidade.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unidade">Unidade (opcional)</Label>
              <Input id="unidade" placeholder="Ex.: un, kg, litro" {...register('unidade')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor_unitario">Valor unitário (R$)</Label>
              <Input
                id="valor_unitario"
                type="number"
                step="0.01"
                min={0}
                {...register('valor_unitario', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              />
              {errors.valor_unitario && <p className="text-sm text-danger-500">{errors.valor_unitario.message}</p>}
            </div>
          </div>

          <Controller
            control={control}
            name="sinalizar_compra"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                Sinalizar para compra (aparece no ícone de Alertas)
              </label>
            )}
          />

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
