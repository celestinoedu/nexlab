import * as React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, FileText, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { EmpresaConfigDialog } from './components/EmpresaConfigDialog'

/**
 * Hub de Configurações — cada área vira um cartão clicável, mesmo padrão do
 * hub de Relatórios (`RelatoriosPage`). Novas áreas entram só adicionando um
 * cartão, sem redesenhar a tela.
 */
export function ConfiguracoesPage() {
  const [empresaAberta, setEmpresaAberta] = React.useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Dados do negócio, usuários e informações legais do sistema.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          icon={Building2}
          titulo="Informações do Negócio"
          descricao="Nome, logo, endereço, telefone e e-mail — o que aparece no cabeçalho dos documentos impressos."
          onClick={() => setEmpresaAberta(true)}
        />
        <Tile
          icon={Users}
          titulo="Usuários"
          descricao="Quem tem acesso ao NexLab, com qual papel — Administrador ou Operador."
          to="/configuracoes/usuarios"
        />
        <Tile
          icon={FileText}
          titulo="Termos e Condições"
          descricao="Termos de uso e como o sistema trata dados pessoais (LGPD)."
          to="/configuracoes/termos"
        />
      </div>

      <EmpresaConfigDialog open={empresaAberta} onOpenChange={setEmpresaAberta} />
    </div>
  )
}

interface TileProps {
  icon: LucideIcon
  titulo: string
  descricao: string
  to?: string
  onClick?: () => void
}

function Tile({ icon: Icon, titulo, descricao, to, onClick }: TileProps) {
  const conteudo = (
    <Card className="h-full transition-colors hover:border-brand-300 hover:bg-brand-50/40">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={20} strokeWidth={1.75} />
        </div>
        <div>
          <CardTitle className="text-base">{titulo}</CardTitle>
          <CardDescription className="mt-1">{descricao}</CardDescription>
        </div>
      </CardContent>
    </Card>
  )

  if (to) return <Link to={to}>{conteudo}</Link>
  return (
    <button type="button" onClick={onClick} className="text-left">
      {conteudo}
    </button>
  )
}
