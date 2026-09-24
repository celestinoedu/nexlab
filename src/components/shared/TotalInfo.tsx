import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Explicação acessível por clique, toque e teclado junto ao indicador. */
export function TotalInfo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Como é calculado: ${titulo}`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Info size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-4 text-left text-sm normal-case text-slate-600" collisionPadding={12}>
        <p className="mb-2 font-semibold text-slate-900">{titulo}</p>
        <div className="space-y-2 leading-relaxed">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

export const REGRA_VALOR_OS = 'Soma quantidade × valor unitário para Clientes ou quantidade × comissão para Parceiros, menos o desconto de cada OS, com mínimo de zero. OS canceladas não entram.'
export const REGRA_MES_OS = 'O mês de referência usa a data de entrega; se ela não estiver preenchida, usa a data de recebimento.'
