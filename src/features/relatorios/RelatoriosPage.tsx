import * as React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Handshake, Scissors, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { RelatorioParceiroDialog } from './components/RelatorioParceiroDialog'

interface Ferramenta {
  to?: string
  id: string
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
    id: 'canhotos',
    to: '/relatorios/canhotos',
    titulo: 'Imprimir canhotos',
    descricao: 'Selecione OS e gere um PDF com os canhotos numa grade otimizada, com marcação de recorte.',
    icon: Scissors,
  },
  {
    id: 'personalizados',
    to: '/relatorios/personalizados',
    titulo: 'Relatórios personalizados',
    descricao: 'Filtre OS por período, serviço e cliente e baixe um extrato completo em PDF.',
    icon: FileText,
  },
  {
    id: 'parceiros',
    titulo: 'Relatório por Cliente/Parceiro',
    descricao: 'Gere um PDF de um cliente ou parceiro por período ou pelas Ordens de Serviço que você selecionar.',
    icon: Handshake,
  },
]

export function RelatoriosPage() {
  const [relatorioParceiroAberto, setRelatorioParceiroAberto] = React.useState(false)

  const conteudoCard = (ferramenta: Ferramenta) => (
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
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">Ferramentas de apoio ao dia a dia do laboratório.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((ferramenta) => (
          ferramenta.to ? (
            <Link key={ferramenta.id} to={ferramenta.to}>{conteudoCard(ferramenta)}</Link>
          ) : (
            <button
              key={ferramenta.id}
              type="button"
              className="text-left"
              onClick={() => setRelatorioParceiroAberto(true)}
            >
              {conteudoCard(ferramenta)}
            </button>
          )
        ))}
      </div>

      <RelatorioParceiroDialog open={relatorioParceiroAberto} onOpenChange={setRelatorioParceiroAberto} />
    </div>
  )
}
