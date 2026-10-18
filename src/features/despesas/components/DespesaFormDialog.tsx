import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { cn } from '@/lib/utils'
import { useDespesaMutations } from '../hooks/useDespesaMutations'
import { STATUS_DESPESA_LABEL, TIPO_DESPESA_LABEL, type Despesa, type StatusDespesa, type TipoDespesa } from '@/types/domain'

const schema = z
  .object({
    tipo: z.enum(['fixa', 'variavel'], { message: 'Escolha Fixa ou Variável' }),
    status: z.enum(['pago', 'pendente']),
    categoria: z.string().optional(),
    descricao: z.string().trim().min(1, 'Informe a descrição'),
    valor: z.number({ message: 'Informe o valor' }).positive('Informe um valor maior que zero'),
    data_despesa: z.string().min(1, 'Informe a data'),
    data_pagamento: z.string().optional(),
    observacoes: z.string().optional(),
  })
  .refine((d) => d.status !== 'pago' || Boolean(d.data_pagamento), {
    message: 'Informe a data do pagamento',
    path: ['data_pagamento'],
  })

type FormValues = z.infer<typeof schema>

interface DespesaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  despesa?: Despesa | null
  /** Mês (yyyy-MM) aberto na tela — a data de uma despesa nova começa nele. */
  mesSugerido?: string
}

function dataInicialNoMes(mes: string | undefined) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  if (!mes || hoje.startsWith(mes)) return hoje
  return `${mes}-01`
}

/** Botões de escolha única (estilo segmentado), acessíveis por teclado. */
function Escolha<T extends string>({
  id,
  valor,
  opcoes,
  onChange,
}: {
  id: string
  valor: T
  opcoes: Record<T, string>
  onChange: (valor: T) => void
}) {
  return (
    <div id={id} role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {(Object.keys(opcoes) as T[]).map((opcao) => (
        <button
          key={opcao}
          type="button"
          role="radio"
          aria-checked={valor === opcao}
          onClick={() => onChange(opcao)}
          className={cn(
            'h-8 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
            valor === opcao ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {opcoes[opcao]}
        </button>
      ))}
    </div>
  )
}

export function DespesaFormDialog({ open, onOpenChange, despesa, mesSugerido }: DespesaFormDialogProps) {
  const isEditing = Boolean(despesa)
  const { createDespesa, updateDespesa } = useDespesaMutations()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const tipo = useWatch({ control, name: 'tipo' })
  const status = useWatch({ control, name: 'status' })

  React.useEffect(() => {
    if (!open) return
    if (despesa) {
      reset({
        tipo: despesa.tipo ?? 'variavel',
        status: despesa.status ?? 'pago',
        categoria: despesa.categoria ?? '',
        descricao: despesa.descricao,
        valor: despesa.valor,
        data_despesa: despesa.data_despesa,
        data_pagamento: despesa.data_pagamento ?? (despesa.status === 'pago' ? despesa.data_despesa : ''),
        observacoes: despesa.observacoes ?? '',
      })
    } else {
      const data = dataInicialNoMes(mesSugerido)
      reset({
        tipo: 'variavel',
        status: 'pago',
        categoria: '',
        descricao: '',
        valor: 0,
        data_despesa: data,
        data_pagamento: data,
        observacoes: '',
      })
    }
  }, [open, despesa, mesSugerido, reset])

  function alterarStatus(proximo: StatusDespesa) {
    setValue('status', proximo, { shouldValidate: false })
    setValue('data_pagamento', proximo === 'pago' ? format(new Date(), 'yyyy-MM-dd') : '')
  }

  const onSubmit = async (values: FormValues) => {
    const input = {
      tipo: values.tipo,
      status: values.status,
      categoria: values.categoria?.trim() || null,
      descricao: values.descricao.trim(),
      valor: values.valor,
      data_despesa: values.data_despesa,
      data_pagamento: values.status === 'pago' ? values.data_pagamento || null : null,
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
          <DialogDescription>Registre uma conta do laboratório, paga ou ainda a pagar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" placeholder="Ex.: Compra de resina" {...register('descricao')} />
            {errors.descricao && <p className="text-sm text-danger-500">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Categoria</Label>
              <Escolha<TipoDespesa>
                id="tipo"
                valor={tipo ?? 'variavel'}
                opcoes={TIPO_DESPESA_LABEL}
                onChange={(v) => setValue('tipo', v)}
              />
              <p className="text-xs text-slate-400">
                {tipo === 'fixa' ? 'Repete todo mês (aluguel, salários).' : 'Muda de um mês para outro (material, manutenção).'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Subcategoria (opcional)</Label>
              <Input id="categoria" placeholder="Ex.: Material, Aluguel, Salários" {...register('categoria')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Label htmlFor="data_despesa">Data / vencimento</Label>
              <Input id="data_despesa" type="date" {...register('data_despesa')} />
              {errors.data_despesa && <p className="text-sm text-danger-500">{errors.data_despesa.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Escolha<StatusDespesa>
                id="status"
                valor={status ?? 'pago'}
                opcoes={STATUS_DESPESA_LABEL}
                onChange={alterarStatus}
              />
            </div>
            {status === 'pago' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data_pagamento">Pago em</Label>
                <Input id="data_pagamento" type="date" {...register('data_pagamento')} />
                {errors.data_pagamento && <p className="text-sm text-danger-500">{errors.data_pagamento.message}</p>}
              </div>
            )}
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
