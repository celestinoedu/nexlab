import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface EmConstrucaoProps {
  titulo: string
  descricao?: string
}

/**
 * Placeholder para módulos ainda não implementados (roadmap em docs/roadmap.md).
 * Existe para a navegação nunca levar a uma tela quebrada durante a Fase 1.
 */
export function EmConstrucao({ titulo, descricao }: EmConstrucaoProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">{titulo}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <Construction className="text-brand-600" size={26} />
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            {descricao ??
              `O módulo "${titulo}" ainda está sendo construído e chega em uma próxima etapa do projeto.`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
