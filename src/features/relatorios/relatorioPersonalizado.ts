import {
  valorEfetivoItem,
  valorTotalOrdem,
  type OrdemServicoComRelacoes,
} from '@/types/domain'

/** Itens que devem aparecer no extrato conforme o filtro de serviço. */
export function itensDoRelatorio(ordem: OrdemServicoComRelacoes, servicoId: string | null) {
  if (!servicoId) return ordem.itens
  return ordem.itens.filter((item) => item.servico.id === servicoId)
}

/**
 * Sem filtro, mantém o total normal da OS (inclusive desconto). Com um
 * serviço selecionado, soma exclusivamente os itens daquele serviço e suas
 * quantidades; o desconto geral da OS não é atribuído a um item específico.
 */
export function valorOrdemNoRelatorio(ordem: OrdemServicoComRelacoes, servicoId: string | null) {
  if (!servicoId) return valorTotalOrdem(ordem)
  return itensDoRelatorio(ordem, servicoId).reduce(
    (total, item) => total + valorEfetivoItem(item, ordem.entidade.tipo),
    0,
  )
}
