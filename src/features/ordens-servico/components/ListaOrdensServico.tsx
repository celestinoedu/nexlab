import { format, parseISO } from 'date-fns'
import { Download } from 'lucide-react'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { STATUS_OS_LABEL, valorTotalOrdem, type OrdemServicoComRelacoes, type StatusOS } from '@/types/domain'

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

export function ListaOrdensServico({ ordens, onEditOrdem, onImprimirOrdem }: ListaOrdensServicoProps) {
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
            <th className="px-4 py-3">Nº OS</th>
            <th className="px-4 py-3">Cliente / Parceiro</th>
            <th className="px-4 py-3">Serviços</th>
            <th className="px-4 py-3">Cliente final</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Recebimento</th>
            <th className="px-4 py-3">Previsão</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {ordens.map((ordem) => (
            <tr
              key={ordem.id}
              onClick={() => onEditOrdem(ordem)}
              className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3 text-slate-400">#{ordem.numero_os}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-800">{ordem.entidade.nome}</span>
                  <Badge variant={ordem.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'}>
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
              <td className="px-4 py-3 text-slate-500">{ordem.cliente_final || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={STATUS_BADGE_VARIANT[ordem.status]}>{STATUS_OS_LABEL[ordem.status]}</Badge>
                  <Badge variant={ordem.status_pagamento === 'pago' ? 'success' : 'warning'}>
                    {ordem.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-500">
                {format(parseISO(ordem.data_recebimento), 'dd/MM/yyyy')}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {ordem.data_prevista ? format(parseISO(ordem.data_prevista), 'dd/MM/yyyy') : '—'}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-800">
                {valorTotalOrdem(ordem).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
