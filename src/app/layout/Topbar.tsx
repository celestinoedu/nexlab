import { LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
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

export function Topbar() {
  const { user, signOut } = useAuth()
  const iniciais = getIniciais(user?.email)

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Logo />
      </div>
      <div className="hidden md:block" />

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
    </header>
  )
}

function getIniciais(email?: string | null): string {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}
