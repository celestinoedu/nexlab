import * as React from 'react'
import { LogOut, User as UserIcon, Building2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from '@/components/shared/Logo'
import { EmpresaConfigDialog } from '@/features/configuracoes/components/EmpresaConfigDialog'

export function Topbar() {
  const { user, signOut } = useAuth()
  const { data: empresa } = useEmpresaConfig()
  const iniciais = getIniciais(user?.email)
  const [configAberta, setConfigAberta] = React.useState(false)

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
          <span className="hidden sm:inline">{empresa?.nome_fantasia ?? 'GRS Lab'}</span>
        </button>

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
