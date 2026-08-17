import { Link } from 'react-router-dom'
import { FileText, Scissors, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'

interface Ferramenta {
  to: string
  titulo: string
  descricao: string
  icon: LucideIcon
}

/**
 * Catálogo de ferramentas do módulo Relatórios — cada uma vira um cartão
 * clicável aqui. Novas ferramentas de apoio ao negócio entram só adicionando
 * um item nesta lista.
 */
const FERRAMENTAS: Ferramenta[] = [
  {
    to: '/relatorios/canhotos',
    titulo: 'Imprimir canhotos',
    descricao: 'Selecione OS e gere um PDF com os canhotos numa grade otimizada, com marcação de recorte.',
    icon: Scissors,
  },
  {
    to: '/relatorios/personalizados',
    titulo: 'Relatórios personalizados',
    descricao: 'Filtre OS por período, serviço e cliente e baixe um extrato completo em PDF.',
    icon: FileText,
  },
]

export function RelatoriosPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">Ferramentas de apoio ao dia a dia do laboratório.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((ferramenta) => (
          <Link key={ferramenta.to} to={ferramenta.to}>
            <Card className="h-full transition-colors hover:border-brand-300 hover:bg-brand-50/40">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <ferramenta.icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <CardTitle className="text-base">{ferramenta.titulo}</CardTitle>
                  <CardDescription className="mt-1">{ferramenta.descricao}</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
