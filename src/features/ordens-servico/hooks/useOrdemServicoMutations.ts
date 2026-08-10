import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OrdemServico, OrdemServicoComRelacoes, StatusOS, StatusPagamentoOS } from '@/types/domain'

export interface OrdemServicoItemInput {
  servico_id: string
  cor: string | null
  arco: 'superior' | 'inferior' | null
  quantidade: number
  valor_unitario: number
  valor_comissao: number | null
}

export interface OrdemServicoFormInput {
  numero_os: number | null
  entidade_id: string
  cliente_final: string | null
  status: StatusOS
  data_recebimento: string
  data_prevista: string | null
  data_entrega: string | null
  desconto: number
  observacoes: string | null
  status_pagamento: StatusPagamentoOS
  forma_pagamento: string | null
  itens: OrdemServicoItemInput[]
}

function traduzErroSalvar(message: string): string {
  if (message.toLowerCase().includes('ordens_servico_numero_os_key')) {
    return 'Esse número de OS já está em uso — escolha outro número ou deixe em branco para gerar automaticamente.'
  }
  return 'Não foi possível salvar a OS agora. Tente novamente.'
}

export function useOrdemServicoMutations() {
  const queryClient = useQueryClient()

  const createOrdem = useMutation({
    mutationFn: async (input: OrdemServicoFormInput) => {
      const { itens, numero_os, ...cabecalho } = input
      const { data: ordem, error: ordemErr } = await supabase
        .from('ordens_servico')
        .insert({ ...cabecalho, ...(numero_os ? { numero_os } : {}) })
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
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] })
    },
  })

  const updateOrdem = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: OrdemServicoFormInput }) => {
      const { itens, numero_os, ...cabecalho } = input
      const { error: ordemErr } = await supabase
        .from('ordens_servico')
        .update({ ...cabecalho, ...(numero_os ? { numero_os } : {}) })
        .eq('id', id)
      if (ordemErr) throw new Error(traduzErroSalvar(ordemErr.message))

      // Estratégia "substitui tudo": mais simples que diferenciar item a item
      // numa lista dinâmica do formulário — apaga os itens antigos e insere
      // os atuais.
      const { error: delErr } = await supabase.from('ordem_servico_itens').delete().eq('ordem_id', id)
      if (delErr) throw new Error(traduzErroSalvar(delErr.message))

      const { error: itensErr } = await supabase
        .from('ordem_servico_itens')
        .insert(itens.map((item) => ({ ...item, ordem_id: id })))
      if (itensErr) throw new Error(traduzErroSalvar(itensErr.message))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] })
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
      const patch: Partial<OrdemServico> = { status }
      if (data_entrega !== undefined) patch.data_entrega = data_entrega
      const { error } = await supabase.from('ordens_servico').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status, data_entrega }) => {
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
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] })
    },
  })

  return { createOrdem, updateOrdem, updateStatus }
}
