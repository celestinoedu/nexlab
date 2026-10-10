import * as React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, CreditCard, Loader2, LogOut, Pencil, Search, Settings2, ShieldAlert, Wallet } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIsPlatformAdmin } from '@/hooks/useIsPlatformAdmin'
import { Logo } from '@/components/shared/Logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  SITUACAO_LABEL,
  calcularSituacao,
  descreverPrazo,
  diasAte,
  formatarData,
  formatarMoeda,
  hojeLocal,
  parcelasEmAberto,
  type SituacaoAssinatura,
} from '@/features/assinatura/situacao'
import { useAdminAssinaturas, type AssinaturaAdmin } from './hooks/useAdminAssinaturas'
import { AssinaturaDialog } from './components/AssinaturaDialog'
import { RegistrarPagamentoDialog } from './components/RegistrarPagamentoDialog'

type Filtro = 'todos' | SituacaoAssinatura

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'atrasada', label: 'Em atraso' },
  { valor: 'vence_em_breve', label: 'Vencem em breve' },
  { valor: 'em_dia', label: 'Em dia' },
  { valor: 'sem_cobranca', label: 'Sem cobrança' },
]

const ORDEM: Record<SituacaoAssinatura, number> = { atrasada: 0, vence_em_breve: 1, em_dia: 2, sem_cobranca: 3 }

/**
 * Painel central da Lotus (/#/admin): mensalidade de cada laboratório.
 * Fica fora do AppShell e do OnboardingGate — a conta da Lotus não precisa
 * pertencer a um laboratório. A proteção real está nas funções `admin_*`.
 */
export function AdminPage() {
  const { user, signOut } = useAuth()
  const { data: isAdmin, isLoading: verificando } = useIsPlatformAdmin()
  const { data: itens, isLoading, isError, error } = useAdminAssinaturas(isAdmin === true)
  const [filtro, setFiltro] = React.useState<Filtro>('todos')
  const [busca, setBusca] = React.useState('')
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [pagandoId, setPagandoId] = React.useState<string | null>(null)
  const hoje = hojeLocal()

  const linhas = React.useMemo(
    () =>
      (itens ?? [])
        .map((item) => ({ item, situacao: calcularSituacao(item, hoje) }))
        .sort((a, b) =>
          ORDEM[a.situacao] - ORDEM[b.situacao]
          || (a.item.proximo_vencimento ?? '').localeCompare(b.item.proximo_vencimento ?? '')
          || a.item.nome_fantasia.localeCompare(b.item.nome_fantasia, 'pt-BR'),
        ),
    [itens, hoje],
  )

  if (verificando) {
    return <div className="app-min-screen flex items-center justify-center bg-mist"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
  }
  if (!isAdmin) {
    // Mostra qual conta está logada: a sessão salva costuma ser a da
    // Demonstração, e um redirecionamento silencioso parecia "link quebrado".
    return (
      <div className="app-min-screen flex items-center justify-center bg-mist p-4">
        <Card className="flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-warning-100 text-warning-700"><ShieldAlert size={22} /></span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Painel restrito à Lotus</h1>
            <p className="mt-1 text-sm text-slate-500">
              Você está conectado como <span className="font-medium text-slate-700">{user?.email}</span>, que não tem acesso ao painel administrativo.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button onClick={() => void signOut()}><LogOut />Sair e entrar com outra conta</Button>
            <Button asChild variant="secondary"><Link to="/">Voltar ao app</Link></Button>
          </div>
        </Card>
      </div>
    )
  }

  const contagem = (situacao: SituacaoAssinatura) => linhas.filter((linha) => linha.situacao === situacao).length
  const atrasadas = linhas.filter((linha) => linha.situacao === 'atrasada')
  const cobradas = linhas.filter((linha) => linha.situacao !== 'sem_cobranca')
  const receitaMensal = cobradas.reduce((total, linha) => total + (linha.item.valor_mensal ?? 0), 0)
  const valorEmAtraso = atrasadas.reduce(
    (total, linha) => total + (linha.item.valor_mensal ?? 0) * parcelasEmAberto(linha.item, hoje).filter((parcela) => parcela.atrasada).length,
    0,
  )

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const visiveis = linhas.filter(({ item, situacao }) =>
    (filtro === 'todos' || situacao === filtro)
    && (!termo || item.nome_fantasia.toLocaleLowerCase('pt-BR').includes(termo) || (item.email ?? '').toLowerCase().includes(termo)),
  )
  const editando = itens?.find((item) => item.empresa_id === editandoId) ?? null
  const pagando = itens?.find((item) => item.empresa_id === pagandoId) ?? null

  return (
    <div className="app-min-screen bg-mist">
      <header className="flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 md:px-7">
        <div className="flex items-center gap-3">
          <Logo />
          <Badge variant="brand">Administração</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft /><span className="hidden sm:inline">Voltar ao app</span></Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut /><span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-7">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-brand-600 uppercase">Painel da Lotus</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Assinaturas</h1>
          <p className="mt-1 text-sm text-slate-500">Vencimentos e pagamentos das mensalidades dos clientes NexLab.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador icon={AlertTriangle} tom="danger" titulo="Em atraso" valor={String(atrasadas.length)} detalhe={atrasadas.length ? `${formatarMoeda(valorEmAtraso)} em aberto` : 'Nenhum cliente'} />
          <Indicador icon={CalendarClock} tom="warning" titulo="Vencem em breve" valor={String(contagem('vence_em_breve'))} detalhe="Dentro do prazo de aviso" />
          <Indicador icon={CheckCircle2} tom="success" titulo="Em dia" valor={String(contagem('em_dia'))} detalhe={`${cobradas.length} com cobrança ativa`} />
          <Indicador icon={Wallet} tom="brand" titulo="Receita mensal" valor={formatarMoeda(receitaMensal)} detalhe="Soma das mensalidades ativas" />
        </div>

        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div className="brand-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
              {FILTROS.map(({ valor, label }) => {
                const total = valor === 'todos' ? linhas.length : contagem(valor)
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setFiltro(valor)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      filtro === valor ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {label} <span className={filtro === valor ? 'text-brand-100' : 'text-slate-400'}>{total}</span>
                  </button>
                )
              })}
            </div>
            <div className="relative md:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente" className="pl-9" aria-label="Buscar cliente" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
          ) : isError ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">{error instanceof Error ? error.message : 'Não foi possível carregar os clientes.'}</p>
          ) : !visiveis.length ? (
            <p className="px-6 py-12 text-center text-sm text-slate-400">Nenhum cliente nesta lista.</p>
          ) : (
            <>
              <table className="hidden w-full text-sm md:table">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-4 py-3">Mensalidade</th>
                    <th className="px-4 py-3">Próximo vencimento</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3">Último pagamento</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map(({ item, situacao }) => (
                    <tr key={item.empresa_id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3.5">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-slate-800"><span>{item.nome_fantasia}</span>{item.debito_automatico === 'authorized' && <DebitoBadge />}</p>
                        <p className="text-xs text-slate-400">{[item.email, `${item.usuarios_ativos} usuário${item.usuarios_ativos === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{item.valor_mensal != null ? formatarMoeda(item.valor_mensal) : '—'}</td>
                      <td className="px-4 py-3.5"><Vencimento item={item} situacao={situacao} hoje={hoje} /></td>
                      <td className="px-4 py-3.5"><SituacaoBadge item={item} situacao={situacao} /></td>
                      <td className="px-4 py-3.5 text-slate-500">{item.ultimo_pagamento ? formatarData(item.ultimo_pagamento) : '—'}</td>
                      <td className="px-5 py-3.5">
                        <Acoes item={item} situacao={situacao} onEditar={() => setEditandoId(item.empresa_id)} onPagar={() => setPagandoId(item.empresa_id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="flex flex-col divide-y divide-slate-100 md:hidden">
                {visiveis.map(({ item, situacao }) => (
                  <li key={item.empresa_id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium text-slate-800"><span className="truncate">{item.nome_fantasia}</span>{item.debito_automatico === 'authorized' && <DebitoBadge />}</p>
                        <p className="text-sm text-slate-500">{item.valor_mensal != null ? `${formatarMoeda(item.valor_mensal)} por mês` : 'Cobrança não configurada'}</p>
                      </div>
                      <SituacaoBadge item={item} situacao={situacao} />
                    </div>
                    {item.proximo_vencimento && <Vencimento item={item} situacao={situacao} hoje={hoje} />}
                    <Acoes item={item} situacao={situacao} onEditar={() => setEditandoId(item.empresa_id)} onPagar={() => setPagandoId(item.empresa_id)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </main>

      <AssinaturaDialog item={editando} onOpenChange={(aberto) => !aberto && setEditandoId(null)} />
      <RegistrarPagamentoDialog item={pagando} onOpenChange={(aberto) => !aberto && setPagandoId(null)} />
    </div>
  )
}

const TONS = {
  danger: 'bg-danger-100 text-danger-500',
  warning: 'bg-warning-100 text-warning-700',
  success: 'bg-success-100 text-success-700',
  brand: 'bg-brand-50 text-brand-700',
}

function Indicador({ icon: Icon, tom, titulo, valor, detalhe }: { icon: React.ElementType; tom: keyof typeof TONS; titulo: string; valor: string; detalhe: string }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className={cn('flex size-8 items-center justify-center rounded-lg', TONS[tom])}><Icon size={16} /></span>
        <span className="text-sm font-medium text-slate-500">{titulo}</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{valor}</p>
        <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>
      </div>
    </Card>
  )
}

function SituacaoBadge({ item, situacao }: { item: AssinaturaAdmin; situacao: SituacaoAssinatura }) {
  const { label, variant } = SITUACAO_LABEL[situacao]
  const pausada = situacao === 'sem_cobranca' && item.proximo_vencimento != null
  return <Badge variant={variant} className="shrink-0 whitespace-nowrap">{pausada ? 'Pausada' : label}</Badge>
}

function Vencimento({ item, situacao, hoje }: { item: AssinaturaAdmin; situacao: SituacaoAssinatura; hoje: string }) {
  if (!item.proximo_vencimento) return <span className="text-slate-400">—</span>
  const vencidas = parcelasEmAberto(item, hoje).filter((parcela) => parcela.atrasada).length
  const prazo = vencidas > 1 ? `${vencidas} mensalidades em aberto` : descreverPrazo(diasAte(item.proximo_vencimento, hoje))
  return (
    <span className="flex items-baseline gap-2 md:flex-col md:gap-0">
      <span className="font-medium text-slate-700">{formatarData(item.proximo_vencimento)}</span>
      {situacao !== 'sem_cobranca' && (
        <span className={cn('text-xs', situacao === 'atrasada' ? 'font-medium text-danger-500' : situacao === 'vence_em_breve' ? 'text-warning-700' : 'text-slate-400')}>{prazo}</span>
      )}
    </span>
  )
}

function Acoes({ item, situacao, onEditar, onPagar }: { item: AssinaturaAdmin; situacao: SituacaoAssinatura; onEditar: () => void; onPagar: () => void }) {
  if (!item.proximo_vencimento) {
    return (
      <div className="flex md:justify-end">
        <Button size="sm" variant="secondary" onClick={onEditar}><Settings2 />Configurar cobrança</Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 md:justify-end">
      {situacao !== 'sem_cobranca' && (
        <Button size="sm" variant={situacao === 'atrasada' ? 'primary' : 'secondary'} onClick={onPagar} className="flex-1 md:flex-none">
          <CheckCircle2 />Registrar pagamento
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onEditar} aria-label={`Editar assinatura de ${item.nome_fantasia}`} title="Editar assinatura">
        <Pencil />
        <span className="md:sr-only">Editar</span>
      </Button>
    </div>
  )
}

function DebitoBadge() {
  return <Badge variant="info" className="shrink-0 whitespace-nowrap" title="Paga por débito automático no cartão (Mercado Pago)"><CreditCard size={12} />Débito automático</Badge>
}
