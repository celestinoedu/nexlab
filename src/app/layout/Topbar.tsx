import * as React from 'react'
import { Link } from 'react-router-dom'
import { LogOut, User as UserIcon, Building2, Bell, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useInsumos } from '@/features/estoque/hooks/useInsumos'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Logo } from '@/components/shared/Logo'
import { EmpresaConfigDialog } from '@/features/configuracoes/components/EmpresaConfigDialog'

export function Topbar() {
  const { user, signOut } = useAuth()
  const { data: empresa } = useEmpresaConfig()
  const { data: insumos } = useInsumos()
  const iniciais = getIniciais(user?.email)
  const [configAberta, setConfigAberta] = React.useState(false)
  const sinalizados = (insumos ?? []).filter((i) => i.sinalizar_compra)

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Logo />
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setConfigAberta(true)}
          className="flex items-center gap-2 rounded-full border border-slate-200 py-1.5 pl-3 pr-3.5 text-sm font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500/40"
          title="Informações do negócio"
        >
          <Building2 size={16} className="text-slate-400" />
          <span className="hidden sm:inline">{empresa?.nome_fantasia ?? 'NexLab'}</span>
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500/40"
              title="Alertas"
              aria-label="Alertas"
            >
              <Bell size={16} />
              {sinalizados.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
                  {sinalizados.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-800">Alertas de Estoque</p>
              <p className="text-xs text-slate-400">Insumos sinalizados para compra</p>
            </div>
            {sinalizados.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Nenhum alerta no momento.</p>
            ) : (
              <ul className="flex max-h-72 flex-col overflow-y-auto py-1">
                {sinalizados.map((insumo) => (
                  <li key={insumo.id}>
                    <Link
                      to="/estoque"
                      className="flex items-start gap-2 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning-500" />
                      <span>
                        <span className="block font-medium text-slate-700">{insumo.nome}</span>
                        {insumo.local_estoque && (
                          <span className="block text-xs text-slate-400">{insumo.local_estoque}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
            <Avatar>
              <AvatarFallback>{iniciais}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon size={16} />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => signOut()} className="text-danger-500 focus:text-danger-700">
              <LogOut size={16} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EmpresaConfigDialog open={configAberta} onOpenChange={setConfigAberta} />
    </header>
  )
}

function getIniciais(email?: string | null): string {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}
