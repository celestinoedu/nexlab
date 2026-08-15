import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, invalidarSeReal, novoIdDemo, agoraIso } from '@/lib/demoMode'
import type { Entidade, Servico, TabelaPreco, TipoEntidade } from '@/types/domain'

export interface EntidadeFormInput {
  tipo: TipoEntidade
  nome: string
  documento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  observacoes: string | null
  ativo: boolean
}

function traduzErroSalvar(message: string): string {
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
    return 'Já existe um cadastro com esses dados.'
  }
  return 'Não foi possível salvar agora. Tente novamente.'
}

/** Insere a nova entidade nas duas variantes de cache de `useEntidades` (com e sem inativas). */
function inserirEntidadeNoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  entidade: Entidade,
) {
  queryClient.setQueryData<Entidade[]>(['entidades', 'todas', true], (old) => [entidade, ...(old ?? [])])
  if (entidade.ativo) {
    queryClient.setQueryData<Entidade[]>(['entidades', 'todas', false], (old) => [entidade, ...(old ?? [])])
  }
}

function atualizarEntidadeNoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  input: EntidadeFormInput,
) {
  for (const key of [['entidades', 'todas', true], ['entidades', 'todas', false]] as const) {
    queryClient.setQueryData<Entidade[]>(key, (old) =>
      (old ?? []).map((e) => (e.id === id ? { ...e, ...input, updated_at: agoraIso() } : e)),
    )
  }
  // Reaplica o filtro "só ativas" — se a edição desativou o cadastro, some da lista curta.
  if (!input.ativo) {
    queryClient.setQueryData<Entidade[]>(['entidades', 'todas', false], (old) =>
      (old ?? []).filter((e) => e.id !== id),
    )
  }
}

/** Replica o trigger `trg_copiar_precos_cliente` (migration 0009) só em cache — Cliente novo nasce com a tabela de preços igual ao catálogo. */
function copiarPrecosClienteNoCache(queryClient: ReturnType<typeof useQueryClient>, entidadeId: string) {
  const servicosAtivos =
    queryClient.getQueryData<Servico[]>(['servicos', false]) ??
    (queryClient.getQueryData<Servico[]>(['servicos', true]) ?? []).filter((s) => s.ativo)
  const linhas: TabelaPreco[] = servicosAtivos.map((s) => ({
    id: novoIdDemo(),
    entidade_id: entidadeId,
    servico_id: s.id,
    preco: s.preco_padrao,
    preco_parceiro: null,
    updated_at: agoraIso(),
  }))
  queryClient.setQueryData(['tabela_precos', entidadeId], () => {
    const porServico = new Map<string, { preco: number; precoParceiro: number | null }>()
    for (const linha of linhas) porServico.set(linha.servico_id, { preco: linha.preco, precoParceiro: null })
    return porServico
  })
}

export function useEntidadeMutations() {
  const queryClient = useQueryClient()

  const createEntidade = useMutation({
    mutationFn: async (input: EntidadeFormInput) => {
      if (isDemoAtivo(queryClient)) {
        const entidade: Entidade = { id: novoIdDemo(), ...input, created_at: agoraIso(), updated_at: agoraIso() }
        inserirEntidadeNoCache(queryClient, entidade)
        if (entidade.tipo === 'cliente') copiarPrecosClienteNoCache(queryClient, entidade.id)
        return entidade
      }
      const { data, error } = await supabase.from('entidades').insert(input).select().single()
      if (error) throw new Error(traduzErroSalvar(error.message))
      return data as Entidade
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['entidades'])
    },
  })

  const updateEntidade = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: EntidadeFormInput }) => {
      if (isDemoAtivo(queryClient)) {
        atualizarEntidadeNoCache(queryClient, id, input)
        return
      }
      const { error } = await supabase.from('entidades').update(input).eq('id', id)
      if (error) throw new Error(traduzErroSalvar(error.message))
    },
    onSuccess: () => {
      invalidarSeReal(queryClient, ['entidades'])
    },
  })

  return { createEntidade, updateEntidade }
}
