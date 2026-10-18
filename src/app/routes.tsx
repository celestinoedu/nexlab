import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/layout/ProtectedRoute'
import { OnboardingGate } from '@/app/layout/OnboardingGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { UpdatePasswordPage } from '@/features/auth/components/UpdatePasswordPage'
// Cada tela é baixada só quando aberta: o pacote inicial fica com o login e o
// layout. O service worker do PWA continua guardando todas para uso offline.
const OrdensServicoPage = lazy(() => import('@/features/ordens-servico/OrdensServicoPage').then((m) => ({ default: m.OrdensServicoPage })))
const EntidadesPage = lazy(() => import('@/features/entidades/EntidadesPage').then((m) => ({ default: m.EntidadesPage })))
const EntidadeExtratoPage = lazy(() => import('@/features/entidades/EntidadeExtratoPage').then((m) => ({ default: m.EntidadeExtratoPage })))
const ServicosPage = lazy(() => import('@/features/servicos/ServicosPage').then((m) => ({ default: m.ServicosPage })))
const EstoquePage = lazy(() => import('@/features/estoque/EstoquePage').then((m) => ({ default: m.EstoquePage })))
const ContasReceberPage = lazy(() => import('@/features/financeiro/ContasReceberPage').then((m) => ({ default: m.ContasReceberPage })))
const DespesasPage = lazy(() => import('@/features/despesas/DespesasPage').then((m) => ({ default: m.DespesasPage })))
const FechamentoFinanceiroPage = lazy(() => import('@/features/fechamento/FechamentoFinanceiroPage').then((m) => ({ default: m.FechamentoFinanceiroPage })))
const RelatoriosPage = lazy(() => import('@/features/relatorios/RelatoriosPage').then((m) => ({ default: m.RelatoriosPage })))
const CanhotosPage = lazy(() => import('@/features/relatorios/CanhotosPage').then((m) => ({ default: m.CanhotosPage })))
const RelatoriosPersonalizadosPage = lazy(() => import('@/features/relatorios/RelatoriosPersonalizadosPage').then((m) => ({ default: m.RelatoriosPersonalizadosPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ConfiguracoesPage = lazy(() => import('@/features/configuracoes/ConfiguracoesPage').then((m) => ({ default: m.ConfiguracoesPage })))
const UsuariosPage = lazy(() => import('@/features/configuracoes/UsuariosPage').then((m) => ({ default: m.UsuariosPage })))
const TermosPage = lazy(() => import('@/features/configuracoes/TermosPage').then((m) => ({ default: m.TermosPage })))
const MeuPerfilPage = lazy(() => import('@/features/configuracoes/MeuPerfilPage').then((m) => ({ default: m.MeuPerfilPage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })))

/**
 * Tela inicial ("/") depende do tamanho de tela: no computador continua
 * Ordens de Serviço (uso operacional no balcão do laboratório); no
 * celular vira o Dashboard (visão geral rápida — o uso mais comum fora do
 * balcão, e também o que abre ao tocar o ícone do PWA na tela inicial).
 * Ordens de Serviço nunca some do celular: fica disponível em
 * `/ordens-servico`, com aba própria e estável na navegação mobile
 * (`MobileNav`) — só a rota "/" muda de conteúdo, nunca a de OS.
 */
function HomeRoute() {
  const isMobile = useIsMobile()
  return isMobile ? <DashboardPage /> : <OrdensServicoPage />
}

function CarregandoTela() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Carregando">
      <Loader2 className="animate-spin text-brand-600" size={28} />
    </div>
  )
}

export function AppRoutes() {
  return (
    <HashRouter>
      <Suspense fallback={<CarregandoTela />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<UpdatePasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/primeiros-passos" element={<OnboardingPage />} />
          {/* Painel da Lotus — fora do OnboardingGate/AppShell; só abre para platform_admins. */}
          <Route path="/admin" element={<AdminPage />} />
          <Route element={<OnboardingGate />}>
            <Route element={<AppShell />}>
              {/* Ordens de Serviço é a tela inicial no computador — módulo
              prioritário do sistema (ver `HomeRoute` acima pro celular). */}
              <Route path="/" element={<HomeRoute />} />
              <Route path="/ordens-servico" element={<OrdensServicoPage />} />
              <Route path="/clientes-parceiros" element={<EntidadesPage />} />
              <Route path="/clientes-parceiros/:id" element={<EntidadeExtratoPage />} />
              <Route path="/servicos" element={<ServicosPage />} />
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/financeiro" element={<ContasReceberPage />} />
              <Route path="/despesas" element={<DespesasPage />} />
              <Route path="/fechamento" element={<FechamentoFinanceiroPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/relatorios/canhotos" element={<CanhotosPage />} />
              <Route path="/relatorios/personalizados" element={<RelatoriosPersonalizadosPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/configuracoes/usuarios" element={<UsuariosPage />} />
              <Route path="/configuracoes/termos" element={<TermosPage />} />
              <Route path="/meu-perfil" element={<MeuPerfilPage />} />
            </Route>
          </Route>
        </Route>
        {/* Nunca deixa uma URL inválida ou antiga resultar em tela vazia. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </HashRouter>
  )
}
