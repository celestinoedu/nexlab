import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/layout/ProtectedRoute'
import { OnboardingGate } from '@/app/layout/OnboardingGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { UpdatePasswordPage } from '@/features/auth/components/UpdatePasswordPage'
import { OrdensServicoPage } from '@/features/ordens-servico/OrdensServicoPage'
import { EntidadesPage } from '@/features/entidades/EntidadesPage'
import { EntidadeExtratoPage } from '@/features/entidades/EntidadeExtratoPage'
import { ServicosPage } from '@/features/servicos/ServicosPage'
import { EstoquePage } from '@/features/estoque/EstoquePage'
import { ContasReceberPage } from '@/features/financeiro/ContasReceberPage'
import { DespesasPage } from '@/features/despesas/DespesasPage'
import { FechamentoFinanceiroPage } from '@/features/fechamento/FechamentoFinanceiroPage'
import { RelatoriosPage } from '@/features/relatorios/RelatoriosPage'
import { CanhotosPage } from '@/features/relatorios/CanhotosPage'
import { RelatoriosPersonalizadosPage } from '@/features/relatorios/RelatoriosPersonalizadosPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ConfiguracoesPage } from '@/features/configuracoes/ConfiguracoesPage'
import { UsuariosPage } from '@/features/configuracoes/UsuariosPage'
import { TermosPage } from '@/features/configuracoes/TermosPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'

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

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<UpdatePasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/primeiros-passos" element={<OnboardingPage />} />
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
            </Route>
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
