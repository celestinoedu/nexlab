import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, novoIdDemo, agoraIso } from '@/lib/demoMode'
import {
  valorTotalOrdem,
  type ContaReceberComRelacoes,
  type Entidade,
  type OrdemServico,
  type OrdemServicoComRelacoes,
  type Servico,
  type StatusOS,
  type StatusPagamentoOS,
} from '@/types/domain'

export interface OrdemServicoItemInput {
  servico_id: string
  cor: string | null
  arco: 'superior' | 'inferior' | null
  quantidade: number
  valor_unitario: number
  valor_comissao: number | null
}

export interface OrdemServicoFormInput {
  numero_os_cliente: string | null
  entidade_id: string
  cliente_final: string | null
  nome_paciente: string | null
  status: StatusOS
  data_recebimento: string
  data_prevista: string | null
  data_entrega: string | null
  desconto: number
  observacoes: string | null
  status_pagamento: StatusPagamentoOS
  forma_pagamento: string | null
  data_pagamento: string | null
  itens: OrdemServicoItemInput[]
}

function traduzErroSalvar(_message: string): string {
  return 'Não foi possível salvar a OS agora. Tente novamente.'
}

/** Mês cheio de fechamento — mesma regra da coluna gerada `ordens_servico.mes_referencia` no banco. */
function calcularMesReferencia(dataEntrega: string | null, dataRecebimento: string): string {
  const base = dataEntrega ?? dataRecebimento
  return `${base.slice(0, 7)}-01`
}

function buscarEntidadeCache(queryClient: QueryClient, entidadeId: string): Pick<Entidade, 'id' | 'nome' | 'tipo'> {
  const listas = [
    queryClient.getQueryData<Entidade[]>(['entidades', 'todas', true]),
    queryClient.getQueryData<Entidade[]>(['entidades', 'todas', false]),
  ]
  for (const lista of listas) {
    const achada = lista?.find((e) => e.id === entidadeId)
    if (achada) return { id: achada.id, nome: achada.nome, tipo: achada.tipo }
  }
  return { id: entidadeId, nome: '—', tipo: 'cliente' }
}

function buscarServicoCache(queryClient: QueryClient, servicoId: string): Pick<Servico, 'id' | 'nome'> {
  const listas = [
    queryClient.getQueryData<Servico[]>(['servicos', true]),
    queryClient.getQueryData<Servico[]>(['servicos', false]),
  ]
  for (const lista of listas) {
    const achado = lista?.find((s) => s.id === servicoId)
    if (achado) return { id: achado.id, nome: achado.nome }
  }
  return { id: servicoId, nome: '—' }
}

/** Monta o objeto completo (com relações) que a leitura do Supabase devolveria, só a partir do formulário + cache. */
function montarOrdemDemo(
  queryClient: QueryClient,
  id: string,
  input: OrdemServicoFormInput,
  numeroOs: number,
  createdAt: string,
): OrdemServicoComRelacoes {
  const entidade = buscarEntidadeCache(queryClient, input.entidade_id)
  const agora = agoraIso()
  return {
    id,
    numero_os: numeroOs,
    numero_os_cliente: input.numero_os_cliente,
    entidade_id: input.entidade_id,
    cliente_final: input.cliente_final,
    nome_paciente: input.nome_paciente,
    status: input.status,
    data_recebimento: input.data_recebimento,
    data_prevista: input.data_prevista,
    data_entrega: input.data_entrega,
    desconto: input.desconto,
    mes_referencia: calcularMesReferencia(input.data_entrega, input.data_recebimento),
    observacoes: input.observacoes,
    status_pagamento: input.status_pagamento,
    forma_pagamento: input.forma_pagamento,
    data_pagamento: input.data_pagamento,
    created_by: null,
    created_at: createdAt,
    updated_at: agora,
    entidade,
    itens: input.itens.map((item) => ({
      id: novoIdDemo(),
      ordem_id: id,
      servico_id: item.servico_id,
      cor: item.cor,
      arco: item.arco,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_comissao: item.valor_comissao,
      created_at: agora,
      servico: buscarServicoCache(queryClient, item.servico_id),
    })),
  }
}

/** Replica trg_fn_criar_conta_receber: cria a Conta a Receber em cache quando a OS passa a "entregue" pela 1ª vez. */
function garantirContaReceberDemo(
  queryClient: QueryClient,
  ordem: OrdemServicoComRelacoes,
  statusAnterior: StatusOS | null,
) {
  if (ordem.status !== 'entregue' || statusAnterior === 'entregue') return

  queryClient.setQueryData<ContaReceberComRelacoes[]>(['contas_receber'], (old) => {
    if ((old ?? []).some((c) => c.ordem_id === ordem.id)) return old ?? []
    const novaConta: ContaReceberComRelacoes = {
      id: novoIdDemo(),
      ordem_id: ordem.id,
      entidade_id: ordem.entidade_id,
      mes_referencia: ordem.mes_referencia,
      valor: Math.max(valorTotalOrdem(ordem), 0),
      status: ordem.status_pagamento === 'pago' ? 'pago' : 'aberto',
      forma_pagamento: ordem.forma_pagamento,
      data_pagamento: ordem.status_pagamento === 'pago' ? ordem.data_pagamento : null,
      justificativa_cancelamento: null,
      created_at: agoraIso(),
      updated_at: agoraIso(),
      entidade: ordem.entidade,
      ordem: {
        id: ordem.id,
        numero_os: ordem.numero_os,
        numero_os_cliente: ordem.numero_os_cliente,
        cliente_final: ordem.cliente_final,
        nome_paciente: ordem.nome_paciente,
        data_entrega: ordem.data_entrega,
      },
    }
    return [novaConta, ...(old ?? [])]
  })
}

function proximoNumeroOsDemo(queryClient: QueryClient): number {
  const ordens = queryClient.getQueryData<OrdemServicoComRelacoes[]>(['ordens_servico']) ?? []
  return ordens.reduce((max, o) => Math.max(max, o.numero_os), 0) + 1
}

export function useOrdemServicoMutations() {
  const queryClient = useQueryClient()

  const createOrdem = useMutation({
    mutationFn: async (input: OrdemServicoFormInput) => {
      if (isDemoAtivo(queryClient)) {
        const id = novoIdDemo()
        const numeroOs = proximoNumeroOsDemo(queryClient)
        const ordem = montarOrdemDemo(queryClient, id, input, numeroOs, agoraIso())
        queryClient.setQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'], (old) => [ordem, ...(old ?? [])])
        garantirContaReceberDemo(queryClient, ordem, null)
        return ordem as unknown as OrdemServico
      }

      const { itens, ...cabecalho } = input
      const { data: ordem, error: ordemErr } = await supabase
        .from('ordens_servico')
        .insert(cabecalho)
        .select()
        .single()
      if (ordemErr) throw new Error(traduzErroSalvar(ordemErr.message))

      const { error: itensErr } = await supabase
        .from('ordem_servico_itens')
        .insert(itens.map((item) => ({ ...item, ordem_id: (ordem as OrdemServico).id })))
      if (itensErr) throw new Error(traduzErroSalvar(itensErr.message))

      return ordem as OrdemServico
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['ordens_servico'])
    },
  })

  const updateOrdem = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: OrdemServicoFormInput }) => {
      if (isDemoAtivo(queryClient)) {
        const atual = queryClient.getQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'])?.find((o) => o.id === id)
        const numeroOs = atual?.numero_os ?? proximoNumeroOsDemo(queryClient)
        const ordem = montarOrdemDemo(queryClient, id, input, numeroOs, atual?.created_at ?? agoraIso())
        queryClient.setQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'], (old) =>
          (old ?? []).map((o) => (o.id === id ? ordem : o)),
        )
        garantirContaReceberDemo(queryClient, ordem, atual?.status ?? null)
        return
      }

      const { itens, ...cabecalho } = input
      const { error: ordemErr } = await supabase
        .from('ordens_servico')
        .update(cabecalho)
        .eq('id', id)
      if (ordemErr) throw new Error(traduzErroSalvar(ordemErr.message))

      // Estratégia "substitui tudo": mais simples que diferenciar item a item
      // numa lista dinâmica do formulário — apaga os itens antigos e insere
      // os atuais.
      const { error: delErr } = await supabase.from('ordem_servico_itens').delete().eq('ordem_id', id)
      if (delErr) throw new Error(traduzErroSalvar(delErr.message))

      const { error: itensErr } = await supabase.from('ordem_servico_itens').insert(itens.map((item) => ({ ...item, ordem_id: id })))
      if (itensErr) throw new Error(traduzErroSalvar(itensErr.message))
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['ordens_servico'])
    },
  })

  /** Muda o status (drag-and-drop no Kanban) com atualização otimista. */
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      data_entrega,
    }: {
      id: string
      status: StatusOS
      data_entrega?: string | null
    }) => {
      if (isDemoAtivo(queryClient)) {
        const atual = queryClient.getQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'])?.find((o) => o.id === id)
        const statusAnterior = atual?.status ?? null
        let atualizada: OrdemServicoComRelacoes | undefined
        queryClient.setQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'], (old) =>
          (old ?? []).map((o) => {
            if (o.id !== id) return o
            atualizada = {
              ...o,
              status,
              data_entrega: data_entrega !== undefined ? data_entrega : o.data_entrega,
              mes_referencia: calcularMesReferencia(
                data_entrega !== undefined ? data_entrega : o.data_entrega,
                o.data_recebimento,
              ),
            }
            return atualizada
          }),
        )
        if (atualizada) garantirContaReceberDemo(queryClient, atualizada, statusAnterior)
        return
      }

      const patch: Partial<OrdemServico> = { status }
      if (data_entrega !== undefined) patch.data_entrega = data_entrega
      const { error } = await supabase.from('ordens_servico').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status, data_entrega }) => {
      if (isDemoAtivo(queryClient)) return undefined
      await queryClient.cancelQueries({ queryKey: ['ordens_servico'] })
      const previous = queryClient.getQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'])
      queryClient.setQueryData<OrdemServicoComRelacoes[]>(['ordens_servico'], (old) =>
        (old ?? []).map((o) =>
          o.id === id
            ? { ...o, status, data_entrega: data_entrega !== undefined ? data_entrega : o.data_entrega }
            : o,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['ordens_servico'], context.previous)
    },
    onSettled: () => {
      invalidarSeReal(queryClient, ['ordens_servico'])
    },
  })

  return { createOrdem, updateOrdem, updateStatus }
}
