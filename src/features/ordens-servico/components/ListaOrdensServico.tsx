import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import {
  ARCO_LABEL,
  STATUS_OS_LABEL,
  valorEfetivoItem,
  valorTotalOrdem,
  type OrdemServicoComRelacoes,
  type StatusOS,
} from '@/types/domain'

interface ListaOrdensServicoProps {
  ordens: OrdemServicoComRelacoes[]
  onEditOrdem: (ordem: OrdemServicoComRelacoes) => void
  onImprimirOrdem: (ordem: OrdemServicoComRelacoes) => void
}

const STATUS_BADGE_VARIANT: Record<StatusOS, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  recebido: 'info',
  em_producao: 'warning',
  pronto_entrega: 'brand',
  entregue: 'success',
  cancelado: 'danger',
}

const COLUNAS_TABELA = 10

function formatarData(data: string | null) {
  return data ? format(parseISO(data), 'dd/MM/yyyy') : '—'
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ListaOrdensServico({ ordens, onEditOrdem, onImprimirOrdem }: ListaOrdensServicoProps) {
  const [expandidas, setExpandidas] = React.useState<Set<string>>(new Set())

  function alternarExpandida(id: string) {
    setExpandidas((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  if (ordens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
        Nenhuma OS encontrada com esses filtros.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
          <tr>
            <th className="w-8 px-2 py-3" />
            <th className="px-4 py-3">Nº OS</th>
            <th className="px-4 py-3">Cliente / Parceiro</th>
            <th className="px-4 py-3">Serviços</th>
            <th className="px-4 py-3">Cliente final / Paciente</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Recebimento</th>
            <th className="px-4 py-3">Previsão</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {ordens.map((ordem) => {
            const expandida = expandidas.has(ordem.id)
            return (
              <React.Fragment key={ordem.id}>
                <tr
                  onClick={() => onEditOrdem(ordem)}
                  className="cursor-pointer border-b border-slate-50 align-top transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => alternarExpandida(ordem.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={expandida ? 'Recolher detalhes' : 'Ver mais detalhes'}
                      aria-expanded={expandida}
                    >
                      {expandida ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400">#{ordem.numero_os}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[14rem] truncate font-medium text-slate-800">{ordem.entidade.nome}</span>
                      <Badge variant={ordem.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'} className="shrink-0">
                        {ordem.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {ordem.itens.length === 1 ? (
                      ordem.itens[0].servico.nome
                    ) : (
                      <span title={ordem.itens.map((i) => i.servico.nome).join(', ')}>
                        {ordem.itens.length} serviços
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {ordem.cliente_final || ordem.nome_paciente ? (
                      <div className="flex flex-col">
                        {ordem.cliente_final && <span>{ordem.cliente_final}</span>}
                        {ordem.nome_paciente && (
                          <span className="text-xs text-slate-400">{ordem.nome_paciente}</span>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* Duas tags sempre separadas (Status da OS × Status de Pagamento), empilhadas
                        numa coluna com espaçamento fixo — não depende da largura disponível pra
                        decidir se ficam lado a lado ou não, então a posição nunca varia de linha
                        pra linha mesmo quando outra célula da mesma linha quebra em 2 linhas. */}
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={STATUS_BADGE_VARIANT[ordem.status]}>{STATUS_OS_LABEL[ordem.status]}</Badge>
                      <Badge variant={ordem.status_pagamento === 'pago' ? 'success' : 'warning'}>
                        {ordem.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatarData(ordem.data_recebimento)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatarData(ordem.data_prevista)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {formatarMoeda(valorTotalOrdem(ordem))}
                  </td>
                  <td className="px-4 py-3">
                    {ordem.status === 'entregue' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onImprimirOrdem(ordem)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Baixar PDF da OS"
                        title="Baixar PDF da OS"
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </td>
                </tr>

                {expandida && (
                  <tr className="border-b border-slate-50 bg-slate-50/60 last:border-0">
                    <td colSpan={COLUNAS_TABELA} className="px-4 py-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase text-slate-400">Serviços</p>
                          <ul className="flex flex-col gap-1">
                            {ordem.itens.map((item) => (
                              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-600">
                                  {item.servico.nome}
                                  {(item.cor || item.arco) && (
                                    <span className="text-slate-400">
                                      {'  ('}
                                      {[item.cor, item.arco ? ARCO_LABEL[item.arco] : null].filter(Boolean).join(' · ')}
                                      {')'}
                                    </span>
                                  )}
                                  {item.quantidade > 1 && <span className="text-slate-400"> x{item.quantidade}</span>}
                                </span>
                                <span className="shrink-0 font-medium text-slate-700">
                                  {formatarMoeda(valorEfetivoItem(item, ordem.entidade.tipo))}
                                </span>
                              </li>
                            ))}
                            {ordem.desconto > 0 && (
                              <li className="flex items-center justify-between gap-3 pt-1 text-sm text-slate-500">
                                <span>Desconto</span>
                                <span>−{formatarMoeda(ordem.desconto)}</span>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <p className="text-xs font-medium uppercase text-slate-400">Data de entrega</p>
                            <p className="text-slate-700">{formatarData(ordem.data_entrega)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-slate-400">Forma de pagamento</p>
                            <p className="text-slate-700">{ordem.forma_pagamento || '—'}</p>
                          </div>
                          {ordem.observacoes && (
                            <div className="col-span-2">
                              <p className="text-xs font-medium uppercase text-slate-400">Observações</p>
                              <p className="text-slate-700">{ordem.observacoes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
