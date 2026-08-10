/**
 * Tipos de domínio espelhando supabase/migrations/0001_init.sql + 0002_ordens_servico.sql.
 * Mantido manualmente enquanto src/types/supabase.ts é um stub (`any`) — ver
 * SETUP.md § "Regenerar os tipos TypeScript" para trocar por tipos gerados.
 */

export type TipoEntidade = 'cliente' | 'parceiro'

export type StatusOS =
  | 'recebido'
  | 'em_producao'
  | 'pronto_entrega'
  | 'entregue'
  | 'cancelado'

export type TipoArco = 'superior' | 'inferior'

export type RoleUsuario = 'admin' | 'operador'

export type StatusPagamentoOS = 'pendente' | 'pago'

export type StatusContaReceber = 'aberto' | 'pago' | 'cancelado'

export type StatusFechamentoPeriodo = 'aberto' | 'fechado'

export interface Entidade {
  id: string
  tipo: TipoEntidade
  nome: string
  documento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Servico {
  id: string
  nome: string
  categoria: string | null
  preco_padrao: number
  tempo_medio_dias: number | null
  ativo: boolean
  created_at: string
}

export interface TabelaPreco {
  id: string
  entidade_id: string
  servico_id: string
  preco: number
  updated_at: string
}

/** Cabeçalho de uma Ordem de Serviço (OS) — os serviços ficam em OrdemServicoItem. */
export interface OrdemServico {
  id: string
  numero_os: number
  entidade_id: string
  cliente_final: string | null
  status: StatusOS
  data_recebimento: string
  data_prevista: string | null
  data_entrega: string | null
  desconto: number
  mes_referencia: string
  observacoes: string | null
  status_pagamento: StatusPagamentoOS
  forma_pagamento: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Um serviço dentro de uma Ordem de Serviço — cor/arco são atributos do item, não do catálogo. */
export interface OrdemServicoItem {
  id: string
  ordem_id: string
  servico_id: string
  cor: string | null
  arco: TipoArco | null
  quantidade: number
  valor_unitario: number
  valor_comissao: number | null
  created_at: string
}

/** OS com entidade e itens (com serviço) já unidos — usada nas telas de listagem/edição. */
export interface OrdemServicoComRelacoes extends OrdemServico {
  entidade: Pick<Entidade, 'id' | 'nome' | 'tipo'>
  itens: (OrdemServicoItem & { servico: Pick<Servico, 'id' | 'nome'> })[]
}

/** Uma linha de Contas a Receber — criada automaticamente quando a OS vira "entregue". */
export interface ContaReceber {
  id: string
  ordem_id: string
  entidade_id: string
  mes_referencia: string
  valor: number
  status: StatusContaReceber
  forma_pagamento: string | null
  data_pagamento: string | null
  justificativa_cancelamento: string | null
  created_at: string
  updated_at: string
}

export interface ContaReceberComRelacoes extends ContaReceber {
  entidade: Pick<Entidade, 'id' | 'nome' | 'tipo'>
  ordem: Pick<OrdemServico, 'id' | 'numero_os' | 'cliente_final' | 'data_entrega'>
}

export interface Despesa {
  id: string
  categoria: string | null
  descricao: string
  valor: number
  data_despesa: string
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FechamentoFinanceiro {
  id: string
  mes_referencia: string
  total_receitas: number
  total_despesas: number
  resultado: number
  status: StatusFechamentoPeriodo
  data_fechamento: string | null
  observacoes: string | null
  created_at: string
}

export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  recebido: 'Recebido',
  em_producao: 'Em Produção',
  pronto_entrega: 'Pronto para Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamentoOS, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
}

export const STATUS_CONTA_RECEBER_LABEL: Record<StatusContaReceber, string> = {
  aberto: 'Aberto',
  pago: 'Pago',
  cancelado: 'Cancelado',
}

export const ARCO_LABEL: Record<TipoArco, string> = {
  superior: 'Superior',
  inferior: 'Inferior',
}

/** Ordem das colunas do Kanban — "cancelado" fica fora do quadro de propósito. */
export const STATUS_KANBAN_ORDEM: StatusOS[] = [
  'recebido',
  'em_producao',
  'pronto_entrega',
  'entregue',
]

/** Valor efetivo de um item para quem recebe (comissão se parceiro, valor cheio se cliente). */
export function valorEfetivoItem(item: OrdemServicoItem, tipoEntidade: TipoEntidade): number {
  const unitario = tipoEntidade === 'parceiro' ? (item.valor_comissao ?? 0) : item.valor_unitario
  return unitario * item.quantidade
}

/** Soma de todos os itens de uma OS, já descontado o desconto da ordem. */
export function valorTotalOrdem(ordem: OrdemServicoComRelacoes): number {
  const subtotal = ordem.itens.reduce((acc, item) => acc + valorEfetivoItem(item, ordem.entidade.tipo), 0)
  return subtotal - ordem.desconto
}
