import { useDraggable } from '@dnd-kit/core'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { OrdemServicoComRelacoes } from '@/types/domain'

interface OrdemServicoCardProps {
  ordem: OrdemServicoComRelacoes
  onClick: () => void
  /** Presente + OS entregue = mostra o botão de baixar o PDF da OS. */
  onImprimir?: () => void
  /** true quando é o card "fantasma" mostrado no DragOverlay */
  overlay?: boolean
}

export function OrdemServicoCard({ ordem, onClick, onImprimir, overlay }: OrdemServicoCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ordem.id,
    disabled: overlay,
  })

  const prazo = calcularPrazo(ordem)
  const descricaoServicos =
    ordem.itens.length === 1
      ? ordem.itens[0].servico.nome
      : `${ordem.itens.length} serviços`

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
        <span className="text-xs font-medium text-slate-400">#{ordem.numero_os}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={ordem.status_pagamento === 'pago' ? 'success' : 'warning'}>
            {ordem.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
          </Badge>
          {prazo && <Badge variant={prazo.variant}>{prazo.label}</Badge>}
          {onImprimir && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onImprimir()
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Baixar PDF da OS"
              title="Baixar PDF da OS"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-slate-900">{ordem.entidade.nome}</span>
        <Badge variant={ordem.entidade.tipo === 'parceiro' ? 'brand' : 'neutral'} className="shrink-0">
          {ordem.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
        </Badge>
      </div>
      <p className="truncate text-sm text-slate-600">{descricaoServicos}</p>
      {(ordem.cliente_final || ordem.nome_paciente) && (
        <p className="truncate text-xs text-slate-400">
          {[ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ')}
        </p>
      )}
    </div>
  )
}

function calcularPrazo(ordem: OrdemServicoComRelacoes) {
  if (ordem.status === 'entregue' || ordem.status === 'cancelado') return null
  if (!ordem.data_prevista) return null

  const dias = differenceInCalendarDays(parseISO(ordem.data_prevista), new Date())

  if (dias < 0) return { label: 'Atrasado', variant: 'danger' as const }
  if (dias <= 2) return { label: dias === 0 ? 'Hoje' : `${dias}d`, variant: 'warning' as const }
  return { label: 'No prazo', variant: 'success' as const }
}
