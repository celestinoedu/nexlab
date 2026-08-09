/**
 * Tipos de domínio espelhando supabase/migrations/0001_init.sql.
 * Mantido manualmente enquanto src/types/supabase.ts é um stub (`any`) — ver
 * SETUP.md § "Regenerar os tipos TypeScript" para trocar por tipos gerados.
 */

export type TipoEntidade = 'cliente' | 'parceiro'

export type StatusDemanda =
  | 'recebido'
  | 'em_producao'
  | 'pronto_entrega'
  | 'entregue'
  | 'cancelado'

export type RoleUsuario = 'admin' | 'operador'

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

export interface Demanda {
  id: string
  numero_os: number
  entidade_id: string
  servico_id: string
  cliente_final: string | null
  quantidade: number
  status: StatusDemanda
  data_entrada: string
  data_prevista: string | null
  data_entrega: string | null
  valor_servico: number
  valor_comissao: number | null
  desconto: number
  mes_referencia: string
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Demanda com os dados de entidade/serviço já unidos (join), usada nas telas de listagem. */
export interface DemandaComRelacoes extends Demanda {
  entidade: Pick<Entidade, 'id' | 'nome' | 'tipo'>
  servico: Pick<Servico, 'id' | 'nome'>
}

export const STATUS_DEMANDA_LABEL: Record<StatusDemanda, string> = {
  recebido: 'Recebido',
  em_producao: 'Em Produção',
  pronto_entrega: 'Pronto para Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

/** Ordem das colunas do Kanban — "cancelado" fica fora do quadro de propósito. */
export const STATUS_KANBAN_ORDEM: StatusDemanda[] = [
  'recebido',
  'em_producao',
  'pronto_entrega',
  'entregue',
]
