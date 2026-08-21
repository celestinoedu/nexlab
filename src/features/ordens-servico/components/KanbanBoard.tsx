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
import { OrdemServicoCard } from './OrdemServicoCard'
import { EntregaConfirmDialog } from './EntregaConfirmDialog'
import { useOrdemServicoMutations } from '@/features/ordens-servico/hooks/useOrdemServicoMutations'
import {
  STATUS_OS_LABEL,
  STATUS_KANBAN_ORDEM,
  referenciaOrdemExibicao,
  type OrdemServicoComRelacoes,
  type StatusOS,
} from '@/types/domain'

interface KanbanBoardProps {
  ordens: OrdemServicoComRelacoes[]
  onEditOrdem: (ordem: OrdemServicoComRelacoes) => void
  onImprimirOrdem: (ordem: OrdemServicoComRelacoes) => void
}

export function KanbanBoard({ ordens, onEditOrdem, onImprimirOrdem }: KanbanBoardProps) {
  const { updateStatus } = useOrdemServicoMutations()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [pendingEntrega, setPendingEntrega] = React.useState<OrdemServicoComRelacoes | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const porColuna = React.useMemo(() => {
    const map = new Map<StatusOS, OrdemServicoComRelacoes[]>()
    for (const status of STATUS_KANBAN_ORDEM) map.set(status, [])
    for (const o of ordens) {
      if (o.status === 'cancelado') continue
      map.get(o.status)?.push(o)
    }
    return map
  }, [ordens])

  const activeOrdem = activeId ? ordens.find((o) => o.id === activeId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const novoStatus = over.id as StatusOS
    const ordem = ordens.find((o) => o.id === active.id)
    if (!ordem || ordem.status === novoStatus) return

    if (novoStatus === 'entregue') {
      setPendingEntrega(ordem)
      return
    }

    updateStatus.mutate({ id: ordem.id, status: novoStatus })
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_KANBAN_ORDEM.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              ordens={porColuna.get(status) ?? []}
              onEditOrdem={onEditOrdem}
              onImprimirOrdem={onImprimirOrdem}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrdem && (
            <OrdemServicoCard ordem={activeOrdem} onClick={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>

      <EntregaConfirmDialog
        open={Boolean(pendingEntrega)}
        onOpenChange={(open) => !open && setPendingEntrega(null)}
        referencia={pendingEntrega
          ? `${referenciaOrdemExibicao(pendingEntrega).rotulo} ${referenciaOrdemExibicao(pendingEntrega).numero}`
          : undefined}
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
  ordens,
  onEditOrdem,
  onImprimirOrdem,
}: {
  status: StatusOS
  ordens: OrdemServicoComRelacoes[]
  onEditOrdem: (ordem: OrdemServicoComRelacoes) => void
  onImprimirOrdem: (ordem: OrdemServicoComRelacoes) => void
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
        <h3 className="text-sm font-semibold text-slate-700">{STATUS_OS_LABEL[status]}</h3>
        <span className="text-xs font-medium text-slate-400">{ordens.length}</span>
      </div>

      <div className="flex min-h-16 flex-col gap-2">
        {ordens.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Nenhuma OS aqui
          </p>
        )}
        {ordens.map((ordem) => (
          <OrdemServicoCard
            key={ordem.id}
            ordem={ordem}
            onClick={() => onEditOrdem(ordem)}
            onImprimir={ordem.status === 'entregue' ? () => onImprimirOrdem(ordem) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
