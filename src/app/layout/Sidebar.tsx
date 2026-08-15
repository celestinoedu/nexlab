import { NavLink } from 'react-router-dom'
import {
  ClipboardList,
  Users,
  Package,
  Wallet,
  Receipt,
  Landmark,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/shared/Logo'

const NAV_ITEMS = [
  { to: '/', label: 'Ordens de Serviço', icon: ClipboardList, end: true },
  { to: '/clientes-parceiros', label: 'Clientes e Parceiros', icon: Users },
  { to: '/servicos', label: 'Catálogo de Serviços', icon: Package },
  { to: '/financeiro', label: 'Contas a Receber', icon: Wallet },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/fechamento', label: 'Fechamento', icon: Landmark },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400">
        GRS Lab · NexLab v0.11.0
      </div>
    </aside>
  )
}
