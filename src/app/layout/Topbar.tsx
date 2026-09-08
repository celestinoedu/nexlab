import * as React from 'react'
import { Link } from 'react-router-dom'
import { LogOut, User as UserIcon, Building2, Bell, AlertTriangle, ChevronDown } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useInsumos } from '@/features/estoque/hooks/useInsumos'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Logo } from '@/components/shared/Logo'
import { EmpresaConfigDialog } from '@/features/configuracoes/components/EmpresaConfigDialog'
import { useProfile } from '@/hooks/useProfile'

export function Topbar() {
  const { user, signOut } = useAuth()
  const { data: empresa } = useEmpresaConfig()
  const { data: profile } = useProfile()
  const { data: insumos } = useInsumos()
  const iniciais = getIniciais(profile?.nome ?? user?.email)
  const [configAberta, setConfigAberta] = React.useState(false)
  const [menuAberto, setMenuAberto] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const sinalizados = (insumos ?? []).filter((i) => i.sinalizar_compra)

  React.useEffect(() => {
    if (!menuAberto) return
    function fecharAoClicarFora(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuAberto(false)
    }
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAberto(false)
    }
    document.addEventListener('mousedown', fecharAoClicarFora)
    document.addEventListener('keydown', fecharComEscape)
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [menuAberto])

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-2 md:hidden">
        <Logo />
      </div>
      <div className="hidden items-center gap-2 text-sm md:flex">
        <span className="size-1.5 rounded-full bg-brand-400" />
        <span className="font-medium text-slate-500">Gestão que conecta</span>
      </div>

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

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            className="flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            aria-label="Abrir menu da conta"
          >
            <Avatar>
              <AvatarFallback>{iniciais}</AvatarFallback>
            </Avatar>
            <ChevronDown size={14} className={`hidden text-slate-400 transition-transform sm:block ${menuAberto ? 'rotate-180' : ''}`} />
          </button>

          {menuAberto && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(23,32,51,0.16)]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <Avatar className="shrink-0">
                  <AvatarFallback>{iniciais}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{profile?.nome || 'Minha conta'}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <div className="p-1.5">
                <Link to="/meu-perfil" onClick={() => setMenuAberto(false)} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><UserIcon size={16} /></span>
                  <span className="flex-1">Meu Perfil</span>
                </Link>
                <button type="button" role="menuitem" onClick={() => { setMenuAberto(false); void signOut() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger-500 transition-colors hover:bg-danger-100/60 hover:text-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/30">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-danger-100/70"><LogOut size={16} /></span>
                  <span className="flex-1">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EmpresaConfigDialog open={configAberta} onOpenChange={setConfigAberta} />
    </header>
  )
}

function getIniciais(nomeOuEmail?: string | null): string {
  if (!nomeOuEmail) return '?'
  const partes = nomeOuEmail.trim().split(/\s+/)
  if (partes.length > 1) return `${partes[0][0]}${partes.at(-1)?.[0] ?? ''}`.toUpperCase()
  return nomeOuEmail.slice(0, 2).toUpperCase()
}
