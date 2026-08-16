import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  Boxes,
  Wallet,
  Receipt,
  Landmark,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// "/" é o Dashboard no celular (ver `HomeRoute` em `routes.tsx`) — por
// isso a aba de Ordens de Serviço aqui aponta pro alias fixo
// `/ordens-servico`, nunca pra "/": senão a aba "OS" mostraria o
// Dashboard, não a lista de OS. Mantém as mesmas 10 telas da Sidebar
// (`Sidebar.tsx`) — nenhuma fica de fora só por estar no celular.
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/ordens-servico', label: 'OS', icon: ClipboardList },
  { to: '/clientes-parceiros', label: 'Clientes', icon: Users },
  { to: '/servicos', label: 'Serviços', icon: Package },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/financeiro', label: 'Receber', icon: Wallet },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/fechamento', label: 'Fechamento', icon: Landmark },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/configuracoes', label: 'Ajustes', icon: Settings },
]

/**
 * Navegação simplificada para telas pequenas (tablet/celular no balcão do
 * laboratório). Versão completa fica na Sidebar (md+). Revisar em detalhe na
 * Fase 5 (polish de responsividade) — ver docs/roadmap.md.
 */
export function MobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium',
              isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-500',
            )
          }
        >
          <item.icon size={18} strokeWidth={1.75} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
