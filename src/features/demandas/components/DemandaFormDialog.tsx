import * as React from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Minus, Plus, AlertTriangle } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Combobox, type ComboboxOption } from '@/components/shared/Combobox'
import { useEntidades } from '@/hooks/useEntidades'
import { useServicos } from '@/hooks/useServicos'
import { useTabelaPrecos } from '@/hooks/useTabelaPrecos'
import { useDemandaMutations, type DemandaFormInput } from '@/features/demandas/hooks/useDemandaMutations'
import type { DemandaComRelacoes } from '@/types/domain'

const schema = z.object({
  entidade_id: z.string().min(1, 'Escolha um cliente ou parceiro antes de salvar'),
  servico_id: z.string().min(1, 'Escolha um serviço antes de salvar'),
  cliente_final: z.string().optional(),
  quantidade: z.number({ message: 'Informe a quantidade' }).int().min(1, 'A quantidade mínima é 1'),
  data_prevista: z.string().optional(),
  valor_servico: z.number({ message: 'Informe o valor' }).min(0, 'O valor não pode ser negativo'),
  valor_comissao: z.number().min(0).nullable().optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DemandaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = editando essa demanda; ausente = criando uma nova. */
  demanda?: DemandaComRelacoes | null
}

export function DemandaFormDialog({ open, onOpenChange, demanda }: DemandaFormDialogProps) {
  const isEditing = Boolean(demanda)
  const { data: entidades } = useEntidades()
  const { data: servicos } = useServicos()
  const { createDemanda, updateDemanda } = useDemandaMutations()

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantidade: 1 },
  })

  const entidadeId = useWatch({ control, name: 'entidade_id' })
  const servicoId = useWatch({ control, name: 'servico_id' })
  const quantidade = useWatch({ control, name: 'quantidade' })

  const { data: precos } = useTabelaPrecos(entidadeId || null)
  const skipNextAutoFill = React.useRef(false)

  // Reseta o formulário sempre que o modal abre — pré-preenche em modo edição.
  React.useEffect(() => {
    if (!open) return
    skipNextAutoFill.current = isEditing
    if (demanda) {
      reset({
        entidade_id: demanda.entidade_id,
        servico_id: demanda.servico_id,
        cliente_final: demanda.cliente_final ?? '',
        quantidade: demanda.quantidade,
        data_prevista: demanda.data_prevista ?? '',
        valor_servico: demanda.valor_servico,
        valor_comissao: demanda.valor_comissao ?? null,
        observacoes: demanda.observacoes ?? '',
      })
    } else {
      reset({
        entidade_id: '',
        servico_id: '',
        cliente_final: '',
        quantidade: 1,
        data_prevista: '',
        valor_servico: 0,
        valor_comissao: null,
        observacoes: '',
      })
    }
  }, [open, demanda, isEditing, reset])

  const entidadeSelecionada = entidades?.find((e) => e.id === entidadeId)
  const servicoSelecionado = servicos?.find((s) => s.id === servicoId)
  const precoEspecifico = servicoId ? precos?.get(servicoId) : undefined

  // Auto-preenche valor/comissão ao trocar entidade ou serviço (não na primeira
  // renderização de uma edição — não queremos sobrescrever um valor já salvo).
  React.useEffect(() => {
    if (!entidadeId || !servicoId || !servicoSelecionado) return
    if (skipNextAutoFill.current) {
      skipNextAutoFill.current = false
      return
    }
    if (entidadeSelecionada?.tipo === 'parceiro') {
      setValue('valor_servico', servicoSelecionado.preco_padrao)
      setValue('valor_comissao', precoEspecifico ?? null)
    } else {
      setValue('valor_servico', precoEspecifico ?? servicoSelecionado.preco_padrao)
      setValue('valor_comissao', null)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadeId, servicoId, precos])

  const avisoPreco = React.useMemo(() => {
    if (!entidadeSelecionada || !servicoSelecionado) return null
    if (entidadeSelecionada.tipo === 'parceiro' && precoEspecifico === undefined) {
      return 'Nenhuma comissão cadastrada para este parceiro/serviço — informe o valor manualmente.'
    }
    if (entidadeSelecionada.tipo === 'cliente' && precoEspecifico === undefined) {
      return 'Usando o preço padrão do catálogo — cadastre um preço específico se for diferente.'
    }
    return null
  }, [entidadeSelecionada, servicoSelecionado, precoEspecifico])

  const entidadeOptions: ComboboxOption[] = (entidades ?? []).map((e) => ({
    value: e.id,
    label: e.nome,
    hint: (
      <Badge variant={e.tipo === 'parceiro' ? 'brand' : 'neutral'} className="ml-2 shrink-0">
        {e.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
      </Badge>
    ),
  }))

  const servicoOptions: ComboboxOption[] = (servicos ?? []).map((s) => ({
    value: s.id,
    label: s.nome,
  }))

  const onSubmit = async (values: FormValues) => {
    const input: DemandaFormInput = {
      entidade_id: values.entidade_id,
      servico_id: values.servico_id,
      cliente_final: values.cliente_final?.trim() || null,
      quantidade: values.quantidade,
      data_prevista: values.data_prevista || null,
      valor_servico: values.valor_servico,
      valor_comissao: values.valor_comissao ?? null,
      observacoes: values.observacoes?.trim() || null,
    }

    try {
      if (demanda) {
        await updateDemanda.mutateAsync({ id: demanda.id, input })
        toast.success('Demanda atualizada.')
      } else {
        await createDemanda.mutateAsync(input)
        toast.success('Demanda criada.')
      }
      onOpenChange(false)
    } catch {
      toast.error('Não foi possível salvar a demanda agora. Tente novamente.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar demanda #${demanda?.numero_os}` : 'Nova demanda'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados e salve.'
              : 'Escolha o cliente ou parceiro e o serviço — o valor é preenchido automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entidade_id">Cliente ou Parceiro</Label>
            <Controller
              control={control}
              name="entidade_id"
              render={({ field }) => (
                <Combobox
                  id="entidade_id"
                  options={entidadeOptions}
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecione um cliente ou parceiro"
                  searchPlaceholder="Buscar por nome..."
                  emptyMessage="Nenhum cliente/parceiro encontrado."
                />
              )}
            />
            {errors.entidade_id && (
              <p className="text-sm text-danger-500">{errors.entidade_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="servico_id">Serviço</Label>
            <Controller
              control={control}
              name="servico_id"
              render={({ field }) => (
                <Combobox
                  id="servico_id"
                  options={servicoOptions}
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecione o serviço"
                  searchPlaceholder="Buscar serviço..."
                  emptyMessage="Nenhum serviço encontrado."
                />
              )}
            />
            {errors.servico_id && (
              <p className="text-sm text-danger-500">{errors.servico_id.message}</p>
            )}
          </div>

          {avisoPreco && (
            <div className="flex items-start gap-2 rounded-xl bg-warning-100 px-3 py-2 text-sm text-warning-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{avisoPreco}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor_servico">
                {entidadeSelecionada?.tipo === 'parceiro' ? 'Valor de referência' : 'Valor do serviço'}
              </Label>
              <Input
                id="valor_servico"
                type="number"
                step="0.01"
                min={0}
                {...register('valor_servico', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              />
              {errors.valor_servico && (
                <p className="text-sm text-danger-500">{errors.valor_servico.message}</p>
              )}
            </div>

            {entidadeSelecionada?.tipo === 'parceiro' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valor_comissao">Comissão</Label>
                <Input
                  id="valor_comissao"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register('valor_comissao', {
                    setValueAs: (v) => (v === '' ? null : Number(v)),
                  })}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cliente_final">Cliente final / Paciente (opcional)</Label>
            <Input id="cliente_final" placeholder="Nome do paciente ou consultório" {...register('cliente_final')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setValue('quantidade', Math.max(1, (quantidade || 1) - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={16} />
                </Button>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  className="text-center"
                  {...register('quantidade', { setValueAs: (v) => (v === '' ? 1 : Number(v)) })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setValue('quantidade', (quantidade || 1) + 1)}
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={16} />
                </Button>
              </div>
              {errors.quantidade && (
                <p className="text-sm text-danger-500">{errors.quantidade.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data_prevista">Data prevista (opcional)</Label>
              <Input id="data_prevista" type="date" {...register('data_prevista')} />
            </div>
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
