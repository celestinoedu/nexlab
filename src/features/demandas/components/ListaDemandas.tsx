import { format, parseISO } from 'date-fns'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { STATUS_DEMANDA_LABEL, type DemandaComRelacoes, type StatusDemanda } from '@/types/domain'

interface ListaDemandasProps {
  demandas: DemandaComRelacoes[]
  onEditDemanda: (demanda: DemandaComRelacoes) => void
}

const STATUS_BADGE_VARIANT: Record<StatusDemanda, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  recebido: 'info',
  em_producao: 'warning',
  pronto_entrega: 'brand',
  entregue: 'success',
  cancelado: 'danger',
}

export function ListaDemandas({ demandas, onEditDemanda }: ListaDemandasProps) {
  if (demandas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
        Nenhuma demanda encontrada com esses filtros.
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
            <th className="px-4 py-3">Serviço</th>
            <th className="px-4 py-3">Cliente final</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Previsão</th>
            <th className="px-4 py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {demandas.map((demanda) => (
            <tr
              key={demanda.id}
              onClick={() => onEditDemanda(demanda)}
              className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3 text-slate-400">#{demanda.numero_os}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-800">{demanda.entidade.nome}</span>
                  <Badge variant={demanda.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'}>
                    {demanda.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{demanda.servico.nome}</td>
              <td className="px-4 py-3 text-slate-500">{demanda.cliente_final || '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_BADGE_VARIANT[demanda.status]}>
                  {STATUS_DEMANDA_LABEL[demanda.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-500">
                {demanda.data_prevista ? format(parseISO(demanda.data_prevista), 'dd/MM/yyyy') : '—'}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-800">
                {formatarMoeda(
                  demanda.entidade.tipo === 'parceiro' ? demanda.valor_comissao : demanda.valor_servico,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatarMoeda(valor: number | null) {
  if (valor === null) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
