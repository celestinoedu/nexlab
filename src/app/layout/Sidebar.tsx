import { NavLink } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ClipboardList,
  Users,
  Package,
  Boxes,
  Wallet,
  Receipt,
  Landmark,
  FileText,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION, APP_ATUALIZADO_EM } from '@/lib/appInfo'
import { Logo } from '@/components/shared/Logo'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'

const NAV_ITEMS = [
  { to: '/', label: 'Ordens de Serviço', icon: ClipboardList, end: true },
  { to: '/clientes-parceiros', label: 'Clientes e Parceiros', icon: Users },
  { to: '/servicos', label: 'Catálogo de Serviços', icon: Package },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/financeiro', label: 'Contas a Receber', icon: Wallet },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/fechamento', label: 'Fechamento', icon: Landmark },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { data: empresa } = useEmpresaConfig()

  return (
    <aside className="relative hidden w-64 shrink-0 flex-col overflow-hidden bg-brand-900 text-white md:flex">
      <div className="pointer-events-none absolute -right-28 -top-24 size-72 rounded-full border border-brand-300/10" />
      <div className="flex h-20 shrink-0 items-center border-b border-white/10 px-6">
        <Logo variant="reverse" size="md" />
      </div>
      <nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10 before:absolute before:-left-1 before:h-5 before:w-1 before:rounded-full before:bg-amber-400'
                  : 'text-brand-100/75 hover:bg-white/7 hover:text-white',
              )
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="relative shrink-0 border-t border-white/10 px-6 py-4 text-xs text-brand-200/55">
        <p className="font-medium text-brand-100/80">
          {empresa?.nome_fantasia ? `${empresa.nome_fantasia} · NexLab` : 'NexLab'}
        </p>
        <p>
          Atualização nº {APP_VERSION} · {format(parseISO(APP_ATUALIZADO_EM), 'dd/MM/yyyy')}
        </p>
        <p className="mt-2 text-[10px] leading-snug text-brand-200/35">
          NexLab é um sistema desenvolvido por{' '}
          <a
            href="https://www.lotusnegocios.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted hover:text-brand-100"
          >
            Lotus Negócios LTDA
          </a>{' '}
          — CNPJ 45.537.878/0001-07
        </p>
      </div>
    </aside>
  )
}
