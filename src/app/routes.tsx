import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/layout/ProtectedRoute'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { OrdensServicoPage } from '@/features/ordens-servico/OrdensServicoPage'
import { EntidadesPage } from '@/features/entidades/EntidadesPage'
import { EntidadeExtratoPage } from '@/features/entidades/EntidadeExtratoPage'
import { ServicosPage } from '@/features/servicos/ServicosPage'
import { ContasReceberPage } from '@/features/financeiro/ContasReceberPage'
import { DespesasPage } from '@/features/despesas/DespesasPage'
import { FechamentoFinanceiroPage } from '@/features/fechamento/FechamentoFinanceiroPage'
import { RelatoriosPage } from '@/features/relatorios/RelatoriosPage'
import { CanhotosPage } from '@/features/relatorios/CanhotosPage'
import { EmConstrucao } from '@/components/shared/EmConstrucao'

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            {/* Ordens de Serviço é a tela inicial — módulo prioritário do sistema. */}
            <Route path="/" element={<OrdensServicoPage />} />
            <Route path="/clientes-parceiros" element={<EntidadesPage />} />
            <Route path="/clientes-parceiros/:id" element={<EntidadeExtratoPage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/financeiro" element={<ContasReceberPage />} />
            <Route path="/despesas" element={<DespesasPage />} />
            <Route path="/fechamento" element={<FechamentoFinanceiroPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/relatorios/canhotos" element={<CanhotosPage />} />
            <Route path="/configuracoes" element={<EmConstrucao titulo="Configurações" />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
