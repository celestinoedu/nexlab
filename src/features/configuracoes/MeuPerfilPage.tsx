import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  Loader2,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useProfile } from '@/hooks/useProfile'
import { cpfCnpjValido, formatarCpfCnpj, somenteDigitos } from '@/lib/documentoFiscal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFaturasAssinatura, type StatusFatura } from './hooks/useFaturasAssinatura'
import { useProfileMutations } from './hooks/useProfileMutations'
import { useMinhaAssinatura } from '@/features/assinatura/useMinhaAssinatura'
import { ID_PAGAR_MENSALIDADE, SITUACAO_LABEL, calcularSituacao, descreverPrazo, diasAte, parcelasEmAberto } from '@/features/assinatura/situacao'
import { PagarMensalidadeCard } from '@/features/assinatura/PagarMensalidadeCard'

const STATUS_FATURA: Record<StatusFatura, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  paga: { label: 'Paga', variant: 'success' },
  pendente: { label: 'Pendente', variant: 'warning' },
  vencida: { label: 'Vencida', variant: 'danger' },
  cancelada: { label: 'Cancelada', variant: 'neutral' },
}

const STATUS_ASSINATURA = {
  trial: { label: 'Período de teste', variant: 'info' as const },
  ativa: { label: 'Assinatura ativa', variant: 'success' as const },
  suspensa: { label: 'Assinatura suspensa', variant: 'warning' as const },
  cancelada: { label: 'Assinatura cancelada', variant: 'danger' as const },
}

export function MeuPerfilPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile, isLoading: carregandoPerfil } = useProfile()
  const { data: empresa, isLoading: carregandoEmpresa } = useEmpresaConfig()
  const { data: faturas, isLoading: carregandoFaturas, isError: erroFaturas } = useFaturasAssinatura()
  const { data: mensalidade } = useMinhaAssinatura(Boolean(empresa && !empresa.is_demo))
  const { salvarPerfil } = useProfileMutations()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  // Retorno do Mercado Pago (back_urls da Edge Function mercadopago-pagamento).
  const [retornoMercadoPago] = React.useState(() => ({ pagamento: searchParams.get('pagamento'), debito: searchParams.get('debito') }))
  const [nome, setNome] = React.useState('')
  const [documentoFiscal, setDocumentoFiscal] = React.useState('')

  React.useEffect(() => {
    if (!profile) return
    setNome(profile.nome ?? '')
    setDocumentoFiscal(formatarCpfCnpj(profile.documento_fiscal ?? ''))
  }, [profile])

  React.useEffect(() => {
    const { pagamento, debito } = retornoMercadoPago
    if (!pagamento && !debito) return
    if (pagamento === 'aprovado') toast.success('Pagamento aprovado! A confirmação aparece aqui em instantes.')
    else if (pagamento === 'pendente') toast.info('Pagamento em processamento. Boleto pode levar até 3 dias úteis para compensar.')
    else if (pagamento === 'falhou') toast.error('O pagamento não foi concluído. Tente novamente ou escolha outra forma de pagamento.')
    if (debito) toast.info('Cadastro do débito automático recebido. A confirmação aparece aqui em instantes.')
    setSearchParams({}, { replace: true })
    // O webhook costuma confirmar em segundos; consulta de novo algumas vezes.
    const atualizar = () => {
      void queryClient.invalidateQueries({ queryKey: ['minha_assinatura'] })
      void queryClient.invalidateQueries({ queryKey: ['faturas_assinatura'] })
    }
    const timers = [3_000, 10_000, 30_000].map((ms) => window.setTimeout(atualizar, ms))
    return () => timers.forEach(window.clearTimeout)
  }, [retornoMercadoPago, queryClient, setSearchParams])

  async function onSalvar(event: React.FormEvent) {
    event.preventDefault()
    if (nome.trim().length < 2) return toast.error('Informe seu nome completo.')
    if (!cpfCnpjValido(documentoFiscal)) return toast.error('Informe um CPF ou CNPJ válido.')

    try {
      await salvarPerfil.mutateAsync({ nome, documentoFiscal: somenteDigitos(documentoFiscal) })
      toast.success('Perfil atualizado com sucesso.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar agora.')
    }
  }

  if (carregandoPerfil || carregandoEmpresa) {
    return <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
  }

  const assinatura = STATUS_ASSINATURA[empresa?.status_assinatura ?? 'ativa']
  const documentoPendente = !profile?.documento_fiscal
  const situacaoMensalidade = calcularSituacao(mensalidade)
  const pagamentoUrgente = situacaoMensalidade === 'atrasada' || situacaoMensalidade === 'vence_em_breve'
  // Parcelas ainda não pagas entram no topo do histórico, antes das faturas pagas.
  const competenciasRegistradas = new Set((faturas ?? []).map((fatura) => fatura.competencia))
  const linhasFaturas = [
    ...parcelasEmAberto(mensalidade)
      .filter((parcela) => !competenciasRegistradas.has(parcela.competencia))
      .reverse()
      .map((parcela) => ({
        id: `aberta-${parcela.competencia}`,
        competencia: parcela.competencia,
        data_vencimento: parcela.vencimento,
        valor: mensalidade!.valor_mensal,
        status: (parcela.atrasada ? 'vencida' : 'pendente') as StatusFatura,
        nota_fiscal_numero: null as string | null,
        nota_fiscal_url: null as string | null,
        emAberto: true,
      })),
    ...(faturas ?? []).map((fatura) => ({ ...fatura, emAberto: false })),
  ]
  const irParaPagamento = () => document.getElementById(ID_PAGAR_MENSALIDADE)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const acaoFatura = (fatura: (typeof linhasFaturas)[number]) => {
    if (fatura.emAberto) {
      // Com débito automático, a parcela que ainda não venceu será cobrada no cartão.
      if (fatura.status === 'pendente' && mensalidade?.mp_preapproval_status === 'authorized') return <span className="text-xs text-slate-400">Cobrança automática</span>
      return <Button variant="secondary" size="sm" onClick={irParaPagamento}>Pagar</Button>
    }
    if (fatura.nota_fiscal_url) return <Button asChild variant="ghost" size="sm"><a href={fatura.nota_fiscal_url} target="_blank" rel="noreferrer"><Download size={15} />Baixar NF</a></Button>
    return <span className="text-slate-300">—</span>
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.1em] text-brand-600 uppercase">Sua conta</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Meu Perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Gerencie seus dados pessoais, assinatura, pagamentos e notas fiscais.</p>
      </div>

      {mensalidade && pagamentoUrgente && <PagarMensalidadeCard assinatura={mensalidade} podeGerenciarDebito={profile?.role === 'admin'} />}

      {documentoPendente && !empresa?.is_demo && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning-500/30 bg-warning-100/70 p-4 text-warning-700">
          <AlertCircle className="mt-0.5 shrink-0" size={19} />
          <div>
            <p className="text-sm font-semibold">Complete seus dados fiscais</p>
            <p className="mt-0.5 text-sm">Informe seu CPF ou CNPJ para continuar usando o NexLab e permitir a emissão das próximas notas fiscais.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><UserRound size={19} /></div>
              <div><h2 className="font-semibold text-slate-900">Dados pessoais</h2><p className="text-sm text-slate-500">Informações do titular desta conta.</p></div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={onSalvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              <Field id="perfil_nome" label="Nome do responsável"><Input id="perfil_nome" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" /></Field>
              <Field id="perfil_documento" label="CPF/CNPJ" required hint="Usado exclusivamente para cadastro e emissão fiscal.">
                <Input id="perfil_documento" value={documentoFiscal} onChange={(event) => setDocumentoFiscal(formatarCpfCnpj(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" aria-required="true" />
              </Field>
              <Field id="perfil_email" label="E-mail de acesso" hint="O e-mail identifica sua conta e não pode ser alterado aqui."><Input id="perfil_email" value={user?.email ?? ''} disabled /></Field>
              <Field id="perfil_role" label="Nível de acesso"><Input id="perfil_role" value={profile?.role === 'admin' ? 'Administrador' : 'Operador'} disabled /></Field>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => navigate('/redefinir-senha')}><KeyRound size={16} />Alterar minha senha</Button>
                <Button type="submit" disabled={salvarPerfil.isPending}>{salvarPerfil.isPending && <Loader2 className="animate-spin" size={16} />}Salvar alterações</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-brand-900 p-6 text-white">
            <div className="flex items-center justify-between gap-3"><ShieldCheck className="text-brand-300" size={22} /><Badge variant={assinatura.variant}>{assinatura.label}</Badge></div>
            <p className="mt-7 text-xs font-medium tracking-[0.1em] text-brand-200 uppercase">Plano atual</p>
            <h2 className="mt-1 text-2xl font-semibold">{empresa?.plano_assinatura || 'Standard'}</h2>
            <p className="mt-2 text-sm text-brand-100/80">{empresa?.nome_fantasia}</p>
          </div>
          <CardContent className="flex flex-col gap-3 pt-5">
            <div className="flex items-center gap-3 text-sm text-slate-600"><CheckCircle2 className="text-success-500" size={17} /><span>Status do serviço atualizado</span></div>
            {mensalidade && situacaoMensalidade !== 'sem_cobranca' ? (
              <>
                <div className="flex items-center gap-3 text-sm text-slate-600"><ReceiptText className="text-slate-400" size={17} /><span>{formatarMoeda(mensalidade.valor_mensal)} por mês</span></div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                  <CalendarDays className="text-slate-400" size={17} />
                  <span>Próximo vencimento: <span className="font-medium text-slate-800">{formatarData(mensalidade.proximo_vencimento)}</span></span>
                  {situacaoMensalidade !== 'em_dia' && <Badge variant={SITUACAO_LABEL[situacaoMensalidade].variant}>{descreverPrazo(diasAte(mensalidade.proximo_vencimento))}</Badge>}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm text-slate-600"><CalendarDays className="text-slate-400" size={17} /><span>Cobrança vinculada à empresa</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      {mensalidade && !pagamentoUrgente && <PagarMensalidadeCard assinatura={mensalidade} podeGerenciarDebito={profile?.role === 'admin'} />}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ReceiptText size={19} /></div>
            <div><h2 className="font-semibold text-slate-900">Pagamentos e faturas</h2><p className="text-sm text-slate-500">Histórico da assinatura e notas fiscais emitidas.</p></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {carregandoFaturas ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
          ) : erroFaturas ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">Não foi possível carregar as faturas agora.</p>
          ) : !linhasFaturas.length ? (
            <div className="flex flex-col items-center px-6 py-12 text-center"><FileText className="text-slate-300" size={32} /><p className="mt-3 text-sm font-medium text-slate-700">Nenhuma fatura emitida</p><p className="mt-1 max-w-sm text-sm text-slate-400">Quando o controle de cobrança começar, suas faturas e notas fiscais aparecerão aqui.</p></div>
          ) : (
            <>
            <ul className="flex flex-col divide-y divide-slate-100 md:hidden">
              {linhasFaturas.map((fatura) => {
                const status = STATUS_FATURA[fatura.status]
                return (
                  <li key={fatura.id} className={`flex items-center justify-between gap-3 px-5 py-4 ${fatura.emAberto ? 'bg-amber-50/40' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 first-letter:uppercase">{formatarCompetencia(fatura.competencia)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatarMoeda(fatura.valor)} · vence {formatarData(fatura.data_vencimento)}</p>
                      {!fatura.emAberto && fatura.nota_fiscal_numero && <p className="mt-0.5 text-xs text-slate-400">{fatura.nota_fiscal_numero}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {acaoFatura(fatura)}
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase"><th className="px-6 py-3">Competência</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Nota fiscal</th><th className="px-6 py-3 text-right">Ação</th></tr></thead>
                <tbody>{linhasFaturas.map((fatura) => {
                  const status = STATUS_FATURA[fatura.status]
                  return <tr key={fatura.id} className={`border-b border-slate-100 last:border-0 ${fatura.emAberto ? 'bg-amber-50/40' : ''}`}><td className="px-6 py-4 font-medium text-slate-700 first-letter:uppercase">{formatarCompetencia(fatura.competencia)}</td><td className="px-4 py-4 text-slate-500">{formatarData(fatura.data_vencimento)}</td><td className="px-4 py-4 font-medium text-slate-700">{formatarMoeda(fatura.valor)}</td><td className="px-4 py-4"><Badge variant={status.variant}>{status.label}</Badge></td><td className="px-4 py-4 text-slate-500">{fatura.emAberto ? '—' : fatura.nota_fiscal_numero || 'Aguardando emissão'}</td><td className="px-6 py-4 text-right">{acaoFatura(fatura)}</td></tr>
                })}</tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label htmlFor={id}>{label}{required && <span className="ml-1 text-danger-500">*</span>}</Label>{children}{hint && <p className="text-xs text-slate-400">{hint}</p>}</div>
}

function formatarMoeda(valor: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor) }
function formatarData(valor: string) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${valor}T00:00:00Z`)) }
function formatarCompetencia(valor: string) { return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${valor}T00:00:00Z`)) }
