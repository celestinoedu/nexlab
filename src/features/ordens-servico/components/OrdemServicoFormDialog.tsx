import * as React from 'react'
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { addDays, format, parseISO } from 'date-fns'
import { Loader2, Trash2, AlertTriangle, PlusCircle, Wallet } from 'lucide-react'
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
import {
  useOrdemServicoMutations,
  type OrdemServicoFormInput,
} from '@/features/ordens-servico/hooks/useOrdemServicoMutations'
import { STATUS_OS_LABEL, referenciaOrdemExibicao, type OrdemServicoComRelacoes, type StatusOS } from '@/types/domain'
import { cn } from '@/lib/utils'
import { InfoFinanceiraDialog } from './InfoFinanceiraDialog'

const itemSchema = z.object({
  servico_id: z.string().min(1, 'Escolha um serviço'),
  cor: z.string().optional(),
  arco: z.union([z.enum(['superior', 'inferior']), z.literal('')]).optional(),
  quantidade: z.number({ message: 'Informe a quantidade' }).int().min(1, 'Mínimo 1'),
  valor_unitario: z.number({ message: 'Informe o valor' }).min(0, 'O valor não pode ser negativo'),
  valor_comissao: z.number().min(0).nullable().optional(),
})

const schema = z
  .object({
    numero_os_cliente: z.string().max(100, 'Use no máximo 100 caracteres').optional(),
    entidade_id: z.string().min(1, 'Escolha um cliente ou parceiro antes de salvar'),
    cliente_final: z.string().optional(),
    nome_paciente: z.string().optional(),
    status: z.enum(['recebido', 'em_producao', 'pronto_entrega', 'entregue', 'cancelado']),
    data_recebimento: z.string().min(1, 'Informe a data de recebimento'),
    data_prevista: z.string().optional(),
    data_entrega: z.string().optional(),
    desconto: z.number().min(0).optional(),
    observacoes: z.string().optional(),
    status_pagamento: z.enum(['pendente', 'pago']),
    forma_pagamento: z.string().optional(),
    data_pagamento: z.string().optional(),
    itens: z.array(itemSchema).min(1, 'Adicione pelo menos um serviço'),
  })
  .refine((data) => data.status !== 'entregue' || Boolean(data.data_entrega), {
    message: 'Informe a data de entrega para marcar a OS como entregue',
    path: ['data_entrega'],
  })

type FormValues = z.infer<typeof schema>

const ITEM_VAZIO = {
  servico_id: '',
  cor: '',
  arco: '' as const,
  quantidade: 1,
  valor_unitario: 0,
  valor_comissao: null,
}

interface OrdemServicoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = editando essa OS; ausente = criando uma nova. */
  ordem?: OrdemServicoComRelacoes | null
}

export function OrdemServicoFormDialog({ open, onOpenChange, ordem }: OrdemServicoFormDialogProps) {
  const isEditing = Boolean(ordem)
  const { data: entidades } = useEntidades()
  const { data: servicos } = useServicos()
  const { createOrdem, updateOrdem } = useOrdemServicoMutations()

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'recebido', status_pagamento: 'pendente', itens: [ITEM_VAZIO] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' })

  const entidadeId = useWatch({ control, name: 'entidade_id' })
  const dataRecebimento = useWatch({ control, name: 'data_recebimento' })
  const itensAtuais = useWatch({ control, name: 'itens' })
  const desconto = useWatch({ control, name: 'desconto' })
  const status = useWatch({ control, name: 'status' })
  const statusPagamento = useWatch({ control, name: 'status_pagamento' })
  const formaPagamento = useWatch({ control, name: 'forma_pagamento' })
  const dataPagamento = useWatch({ control, name: 'data_pagamento' })
  const [infoFinanceiraAberta, setInfoFinanceiraAberta] = React.useState(false)

  const { data: precos } = useTabelaPrecos(entidadeId || null)
  const entidadeSelecionada = entidades?.find((e) => e.id === entidadeId)
  const skipNextAutoSuggestPrazo = React.useRef(false)

  // Reseta o formulário sempre que o modal abre — pré-preenche em modo edição
  // e deixa o número interno a cargo da sequência atômica do banco.
  React.useEffect(() => {
    if (!open) return
    skipNextAutoSuggestPrazo.current = isEditing

    if (ordem) {
      reset({
        numero_os_cliente: ordem.numero_os_cliente ?? '',
        entidade_id: ordem.entidade_id,
        cliente_final: ordem.cliente_final ?? '',
        nome_paciente: ordem.nome_paciente ?? '',
        status: ordem.status,
        data_recebimento: ordem.data_recebimento,
        data_prevista: ordem.data_prevista ?? '',
        data_entrega: ordem.data_entrega ?? '',
        desconto: ordem.desconto,
        observacoes: ordem.observacoes ?? '',
        status_pagamento: ordem.status_pagamento,
        forma_pagamento: ordem.forma_pagamento ?? '',
        data_pagamento: ordem.data_pagamento ?? '',
        itens: ordem.itens.map((item) => ({
          servico_id: item.servico_id,
          cor: item.cor ?? '',
          arco: item.arco ?? '',
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_comissao: item.valor_comissao,
        })),
      })
    } else {
      reset({
        numero_os_cliente: '',
        entidade_id: '',
        cliente_final: '',
        nome_paciente: '',
        status: 'recebido',
        data_recebimento: format(new Date(), 'yyyy-MM-dd'),
        data_prevista: '',
        data_entrega: '',
        desconto: 0,
        observacoes: '',
        status_pagamento: 'pendente',
        forma_pagamento: '',
        data_pagamento: '',
        itens: [ITEM_VAZIO],
      })
    }
  }, [open, ordem, isEditing, reset, setValue])

  // Sugere a data de entrega prevista a partir do tempo médio dos itens
  // escolhidos — não sobrescreve na primeira renderização de uma edição.
  React.useEffect(() => {
    if (!dataRecebimento || !servicos || !itensAtuais?.length) return
    if (skipNextAutoSuggestPrazo.current) {
      skipNextAutoSuggestPrazo.current = false
      return
    }
    const tempos = itensAtuais
      .map((item) => servicos.find((s) => s.id === item.servico_id)?.tempo_medio_dias)
      .filter((t): t is number => typeof t === 'number')
    if (tempos.length === 0) return
    const maiorTempo = Math.max(...tempos)
    setValue('data_prevista', format(addDays(parseISO(dataRecebimento), maiorTempo), 'yyyy-MM-dd'))
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRecebimento, JSON.stringify(itensAtuais?.map((i) => i.servico_id))])

  const entidadeOptions: ComboboxOption[] = (entidades ?? []).map((e) => ({
    value: e.id,
    label: e.nome,
    hint: (
      <Badge variant={e.tipo === 'parceiro' ? 'brand' : 'neutral'} className="ml-2 shrink-0">
        {e.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
      </Badge>
    ),
  }))

  const servicoOptions: ComboboxOption[] = (servicos ?? []).map((s) => ({ value: s.id, label: s.nome }))

  function aplicarPrecoSugerido(index: number, servicoId: string) {
    const servico = servicos?.find((s) => s.id === servicoId)
    if (!servico) return
    const precoEspecifico = precos?.get(servicoId)?.preco
    if (entidadeSelecionada?.tipo === 'parceiro') {
      setValue(`itens.${index}.valor_unitario`, servico.preco_padrao)
      setValue(`itens.${index}.valor_comissao`, precoEspecifico ?? null)
    } else {
      setValue(`itens.${index}.valor_unitario`, precoEspecifico ?? servico.preco_padrao)
      setValue(`itens.${index}.valor_comissao`, null)
    }
  }

  const total = React.useMemo(() => {
    if (!itensAtuais) return 0
    const subtotal = itensAtuais.reduce((acc, item) => {
      const unit =
        entidadeSelecionada?.tipo === 'parceiro' ? item.valor_comissao ?? 0 : item.valor_unitario ?? 0
      return acc + unit * (item.quantidade || 0)
    }, 0)
    return subtotal - (desconto || 0)
  }, [itensAtuais, entidadeSelecionada, desconto])

  const onSubmit = async (values: FormValues) => {
    const input: OrdemServicoFormInput = {
      numero_os_cliente: values.numero_os_cliente?.trim() || null,
      entidade_id: values.entidade_id,
      cliente_final: values.cliente_final?.trim() || null,
      nome_paciente: values.nome_paciente?.trim() || null,
      status: values.status,
      data_recebimento: values.data_recebimento,
      data_prevista: values.data_prevista || null,
      data_entrega: values.status === 'entregue' ? values.data_entrega || null : null,
      desconto: values.desconto || 0,
      observacoes: values.observacoes?.trim() || null,
      status_pagamento: values.status_pagamento,
      forma_pagamento: values.forma_pagamento?.trim() || null,
      data_pagamento: values.status_pagamento === 'pago' ? values.data_pagamento || null : null,
      itens: values.itens.map((item) => ({
        servico_id: item.servico_id,
        cor: item.cor?.trim() || null,
        arco: item.arco || null,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_comissao: item.valor_comissao ?? null,
      })),
    }

    try {
      if (ordem) {
        await updateOrdem.mutateAsync({ id: ordem.id, input })
        toast.success('OS atualizada.')
      } else {
        await createOrdem.mutateAsync(input)
        toast.success('OS criada.')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a OS agora.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {ordem
              ? `Editar ${referenciaOrdemExibicao(ordem).rotulo} ${referenciaOrdemExibicao(ordem).numero}`
              : 'Nova Ordem de Serviço'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados e salve.'
              : 'Escolha o cliente ou parceiro, adicione os serviços e salve.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Coluna direita: serviços da OS */}
            <div className="order-2 flex flex-col gap-2">
              <Label>Serviços da OS</Label>
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <ItemRow
                    key={field.id}
                    index={index}
                    control={control}
                    register={register}
                    servicoOptions={servicoOptions}
                    ehParceiro={entidadeSelecionada?.tipo === 'parceiro'}
                    onServicoChange={(servicoId) => aplicarPrecoSugerido(index, servicoId)}
                    onRemover={fields.length > 1 ? () => remove(index) : undefined}
                    erroServico={errors.itens?.[index]?.servico_id?.message}
                    erroValor={errors.itens?.[index]?.valor_unitario?.message}
                    temPrecoEspecifico={
                      itensAtuais?.[index]?.servico_id
                        ? precos?.has(itensAtuais[index].servico_id)
                        : undefined
                    }
                  />
                ))}
              </div>
              {errors.itens?.message && (
                <p className="text-sm text-danger-500">{errors.itens.message}</p>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => append(ITEM_VAZIO)}
              >
                <PlusCircle size={16} />
                Adicionar serviço
              </Button>
            </div>

            {/* Coluna esquerda: dados gerais da OS */}
            <div className="order-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="numero_os">Nº Registro</Label>
                  <Input
                    id="numero_os"
                    value={ordem ? String(ordem.numero_os) : 'Gerado ao salvar'}
                    disabled
                    readOnly
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
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
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="numero_os_cliente">Nº OS (opcional)</Label>
                <Input
                  id="numero_os_cliente"
                  maxLength={100}
                  placeholder="Número da OS informado pelo cliente"
                  {...register('numero_os_cliente')}
                />
                {errors.numero_os_cliente && (
                  <p className="text-sm text-danger-500">{errors.numero_os_cliente.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cliente_final">Cliente final (opcional)</Label>
                  <Input id="cliente_final" placeholder="Nome do consultório" {...register('cliente_final')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nome_paciente">Nome do paciente (opcional)</Label>
                  <Input id="nome_paciente" placeholder="Nome do paciente" {...register('nome_paciente')} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="data_recebimento">Data de recebimento</Label>
                  <Input id="data_recebimento" type="date" {...register('data_recebimento')} />
                  {errors.data_recebimento && (
                    <p className="text-sm text-danger-500">{errors.data_recebimento.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="data_prevista">Data de entrega (prevista)</Label>
                  <Input id="data_prevista" type="date" {...register('data_prevista')} />
                </div>
              </div>

              <div className={cn('grid grid-cols-1 gap-4', status === 'entregue' && 'sm:grid-cols-2')}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    {...register('status')}
                  >
                    {(Object.keys(STATUS_OS_LABEL) as StatusOS[]).map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {STATUS_OS_LABEL[opcao]}
                      </option>
                    ))}
                  </select>
                </div>
                {status === 'entregue' && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="data_entrega">Data de entrega</Label>
                    <Input id="data_entrega" type="date" {...register('data_entrega')} />
                    {errors.data_entrega && (
                      <p className="text-sm text-danger-500">{errors.data_entrega.message}</p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                className="self-start"
                onClick={() => setInfoFinanceiraAberta(true)}
              >
                <Wallet size={16} />
                Informações financeiras
                <Badge variant={statusPagamento === 'pago' ? 'success' : 'warning'}>
                  {statusPagamento === 'pago' ? 'Pago' : 'Pendente'}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Rodapé: desconto, total e observações */}
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desconto">Desconto (opcional)</Label>
              <Input
                id="desconto"
                type="number"
                step="0.01"
                min={0}
                {...register('desconto', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              />
            </div>
            <div className="flex flex-col justify-end rounded-xl bg-brand-50 px-3 py-2">
              <span className="text-xs font-medium text-brand-700">Total da OS</span>
              <span className="text-lg font-semibold text-brand-900">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
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

      <InfoFinanceiraDialog
        open={infoFinanceiraAberta}
        onOpenChange={setInfoFinanceiraAberta}
        statusPagamento={statusPagamento}
        formaPagamento={formaPagamento ?? ''}
        dataPagamento={dataPagamento ?? ''}
        onSalvar={(dados) => {
          setValue('status_pagamento', dados.status_pagamento)
          setValue('forma_pagamento', dados.forma_pagamento)
          setValue('data_pagamento', dados.data_pagamento)
        }}
      />
    </Dialog>
  )
}

interface ItemRowProps {
  index: number
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  servicoOptions: ComboboxOption[]
  ehParceiro: boolean
  onServicoChange: (servicoId: string) => void
  onRemover?: () => void
  erroServico?: string
  erroValor?: string
  temPrecoEspecifico?: boolean
}

function ItemRow({
  index,
  control,
  register,
  servicoOptions,
  ehParceiro,
  onServicoChange,
  onRemover,
  erroServico,
  erroValor,
  temPrecoEspecifico,
}: ItemRowProps) {
  const quantidade = useWatch({ control, name: `itens.${index}.quantidade` })

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Controller
            control={control}
            name={`itens.${index}.servico_id`}
            render={({ field }) => (
              <Combobox
                options={servicoOptions}
                value={field.value || null}
                onChange={(v) => {
                  field.onChange(v)
                  onServicoChange(v)
                }}
                placeholder="Selecione o serviço"
                searchPlaceholder="Buscar serviço..."
                emptyMessage="Nenhum serviço encontrado."
              />
            )}
          />
          {erroServico && <p className="mt-1 text-xs text-danger-500">{erroServico}</p>}
        </div>

        {onRemover && (
          <button
            type="button"
            onClick={onRemover}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl text-slate-400 hover:bg-danger-100 hover:text-danger-700 sm:self-start"
            aria-label="Remover serviço"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex w-full flex-col gap-1 sm:w-28">
          <Label className="text-xs text-slate-500">Cor / Dente</Label>
          <Input placeholder="Ex.: A2" {...register(`itens.${index}.cor`)} />
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-36">
          <Label className="text-xs text-slate-500">Arco</Label>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            {...register(`itens.${index}.arco`)}
          >
            <option value="">—</option>
            <option value="superior">Superior</option>
            <option value="inferior">Inferior</option>
          </select>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-24">
          <Label className="text-xs text-slate-500">Qtd.</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              className="text-center"
              {...register(`itens.${index}.quantidade`, {
                setValueAs: (v) => (v === '' ? 1 : Number(v)),
              })}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-28">
          <Label className="text-xs text-slate-500">
            {ehParceiro ? 'Valor ref.' : 'Valor'}
          </Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            {...register(`itens.${index}.valor_unitario`, {
              setValueAs: (v) => (v === '' ? 0 : Number(v)),
            })}
          />
          {erroValor && <p className="text-xs text-danger-500">{erroValor}</p>}
        </div>

        {ehParceiro && (
          <div className="flex w-full flex-col gap-1 sm:w-28">
            <Label className="text-xs text-slate-500">Comissão</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              {...register(`itens.${index}.valor_comissao`, {
                setValueAs: (v) => (v === '' ? null : Number(v)),
              })}
            />
          </div>
        )}

        {quantidade > 1 && <span className="text-xs text-slate-400">× {quantidade}</span>}
      </div>

      {temPrecoEspecifico === false && (
        <div className="flex items-start gap-1.5 text-xs text-warning-700">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            {ehParceiro
              ? 'Nenhuma comissão cadastrada para este serviço — informe manualmente.'
              : 'Usando o preço padrão do catálogo.'}
          </span>
        </div>
      )}
    </div>
  )
}
