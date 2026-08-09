import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { DemandaCard } from './DemandaCard'
import { EntregaConfirmDialog } from './EntregaConfirmDialog'
import { useDemandaMutations } from '@/features/demandas/hooks/useDemandaMutations'
import { STATUS_DEMANDA_LABEL, STATUS_KANBAN_ORDEM, type DemandaComRelacoes, type StatusDemanda } from '@/types/domain'

interface KanbanBoardProps {
  demandas: DemandaComRelacoes[]
  onEditDemanda: (demanda: DemandaComRelacoes) => void
}

export function KanbanBoard({ demandas, onEditDemanda }: KanbanBoardProps) {
  const { updateStatus } = useDemandaMutations()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [pendingEntrega, setPendingEntrega] = React.useState<DemandaComRelacoes | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const porColuna = React.useMemo(() => {
    const map = new Map<StatusDemanda, DemandaComRelacoes[]>()
    for (const status of STATUS_KANBAN_ORDEM) map.set(status, [])
    for (const d of demandas) {
      if (d.status === 'cancelado') continue
      map.get(d.status)?.push(d)
    }
    return map
  }, [demandas])

  const activeDemanda = activeId ? demandas.find((d) => d.id === activeId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const novoStatus = over.id as StatusDemanda
    const demanda = demandas.find((d) => d.id === active.id)
    if (!demanda || demanda.status === novoStatus) return

    if (novoStatus === 'entregue') {
      setPendingEntrega(demanda)
      return
    }

    updateStatus.mutate({ id: demanda.id, status: novoStatus })
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_KANBAN_ORDEM.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              demandas={porColuna.get(status) ?? []}
              onEditDemanda={onEditDemanda}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDemanda && (
            <DemandaCard demanda={activeDemanda} onClick={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>

      <EntregaConfirmDialog
        open={Boolean(pendingEntrega)}
        onOpenChange={(open) => !open && setPendingEntrega(null)}
        numeroOs={pendingEntrega?.numero_os}
        onConfirm={(dataEntrega) => {
          if (pendingEntrega) {
            updateStatus.mutate({ id: pendingEntrega.id, status: 'entregue', data_entrega: dataEntrega })
          }
          setPendingEntrega(null)
        }}
      />
    </>
  )
}

function KanbanColumn({
  status,
  demandas,
  onEditDemanda,
}: {
  status: StatusDemanda
  demandas: DemandaComRelacoes[]
  onEditDemanda: (demanda: DemandaComRelacoes) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 transition-colors',
        isOver && 'border-brand-300 bg-brand-50',
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-700">{STATUS_DEMANDA_LABEL[status]}</h3>
        <span className="text-xs font-medium text-slate-400">{demandas.length}</span>
      </div>

      <div className="flex min-h-16 flex-col gap-2">
        {demandas.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Nenhuma demanda aqui
          </p>
        )}
        {demandas.map((demanda) => (
          <DemandaCard key={demanda.id} demanda={demanda} onClick={() => onEditDemanda(demanda)} />
        ))}
      </div>
    </div>
  )
}
