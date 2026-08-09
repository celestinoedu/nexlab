import { useDraggable } from '@dnd-kit/core'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { DemandaComRelacoes } from '@/types/domain'

interface DemandaCardProps {
  demanda: DemandaComRelacoes
  onClick: () => void
  /** true quando é o card "fantasma" mostrado no DragOverlay */
  overlay?: boolean
}

export function DemandaCard({ demanda, onClick, overlay }: DemandaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: demanda.id,
    disabled: overlay,
  })

  const prazo = calcularPrazo(demanda)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={cn(
        'flex cursor-grab flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:cursor-grabbing',
        isDragging && !overlay && 'opacity-30',
        overlay && 'rotate-2 shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">#{demanda.numero_os}</span>
        {prazo && (
          <Badge variant={prazo.variant} className="shrink-0">
            {prazo.label}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-slate-900">{demanda.entidade.nome}</span>
        <Badge variant={demanda.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'} className="shrink-0">
          {demanda.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
        </Badge>
      </div>
      <p className="truncate text-sm text-slate-600">{demanda.servico.nome}</p>
      {demanda.cliente_final && (
        <p className="truncate text-xs text-slate-400">{demanda.cliente_final}</p>
      )}
    </div>
  )
}

function calcularPrazo(demanda: DemandaComRelacoes) {
  if (demanda.status === 'entregue' || demanda.status === 'cancelado') return null
  if (!demanda.data_prevista) return null

  const dias = differenceInCalendarDays(parseISO(demanda.data_prevista), new Date())

  if (dias < 0) return { label: 'Atrasado', variant: 'danger' as const }
  if (dias <= 2) return { label: dias === 0 ? 'Hoje' : `${dias}d`, variant: 'warning' as const }
  return { label: 'No prazo', variant: 'success' as const }
}
