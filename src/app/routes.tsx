import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/layout/ProtectedRoute'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { OrdensServicoPage } from '@/features/ordens-servico/OrdensServicoPage'
import { EntidadesPage } from '@/features/entidades/EntidadesPage'
import { ServicosPage } from '@/features/servicos/ServicosPage'
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
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/financeiro" element={<EmConstrucao titulo="Contas a Receber" />} />
            <Route path="/relatorios" element={<EmConstrucao titulo="Relatórios" />} />
            <Route path="/configuracoes" element={<EmConstrucao titulo="Configurações" />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
