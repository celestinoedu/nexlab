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
import { useServicoMutations } from '../hooks/useServicoMutations'
import type { Servico } from '@/types/domain'

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome do serviço'),
  categoria: z.string().optional(),
  preco_padrao: z.number({ message: 'Informe o preço padrão' }).min(0, 'O valor não pode ser negativo'),
  tempo_medio_dias: z.number().int().min(0).nullable().optional(),
  ativo: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface ServicoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servico?: Servico | null
}

export function ServicoFormDialog({ open, onOpenChange, servico }: ServicoFormDialogProps) {
  const isEditing = Boolean(servico)
  const { createServico, updateServico } = useServicoMutations()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ativo: true },
  })

  React.useEffect(() => {
    if (!open) return
    if (servico) {
      reset({
        nome: servico.nome,
        categoria: servico.categoria ?? '',
        preco_padrao: servico.preco_padrao,
        tempo_medio_dias: servico.tempo_medio_dias,
        ativo: servico.ativo,
      })
    } else {
      reset({ nome: '', categoria: '', preco_padrao: 0, tempo_medio_dias: 7, ativo: true })
    }
  }, [open, servico, reset])

  const onSubmit = async (values: FormValues) => {
    const input = {
      nome: values.nome.trim(),
      categoria: values.categoria?.trim() || null,
      preco_padrao: values.preco_padrao,
      tempo_medio_dias: values.tempo_medio_dias ?? null,
      ativo: values.ativo,
    }

    try {
      if (servico) {
        await updateServico.mutateAsync({ id: servico.id, input })
        toast.success('Serviço atualizado.')
      } else {
        await createServico.mutateAsync(input)
        toast.success('Serviço criado.')
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
          <DialogTitle>{isEditing ? 'Editar serviço' : 'Novo serviço do catálogo'}</DialogTitle>
          <DialogDescription>
            Cor e arco são escolhidos dentro de cada Ordem de Serviço — aqui é só o serviço "pai".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome do serviço</Label>
            <Input id="nome" placeholder='Ex.: "Contenção Hawley"' {...register('nome')} />
            {errors.nome && <p className="text-sm text-danger-500">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoria">Categoria (opcional)</Label>
            <Input id="categoria" placeholder="Ex.: Aparelhos Removíveis" {...register('categoria')} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preco_padrao">Preço padrão (R$)</Label>
              <Input
                id="preco_padrao"
                type="number"
                step="0.01"
                min={0}
                {...register('preco_padrao', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              />
              {errors.preco_padrao && (
                <p className="text-sm text-danger-500">{errors.preco_padrao.message}</p>
              )}
              <p className="text-xs text-slate-400">
                Usado quando o cliente/parceiro não tem preço específico cadastrado.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tempo_medio_dias">Tempo médio (dias)</Label>
              <Input
                id="tempo_medio_dias"
                type="number"
                min={0}
                {...register('tempo_medio_dias', {
                  setValueAs: (v) => (v === '' ? null : Number(v)),
                })}
              />
              <p className="text-xs text-slate-400">Sugere a data de entrega prevista na OS.</p>
            </div>
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="size-4 rounded border-slate-300" {...register('ativo')} />
              Serviço ativo (desmarque para ocultar do catálogo sem apagar o histórico)
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
