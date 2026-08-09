import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/layout/ProtectedRoute'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { DemandasPage } from '@/features/demandas/DemandasPage'
import { EmConstrucao } from '@/components/shared/EmConstrucao'

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            {/* Demandas é a tela inicial — módulo prioritário do sistema. */}
            <Route path="/" element={<DemandasPage />} />
            <Route
              path="/clientes-parceiros"
              element={<EmConstrucao titulo="Clientes e Parceiros" />}
            />
            <Route path="/servicos" element={<EmConstrucao titulo="Catálogo de Serviços" />} />
            <Route path="/financeiro" element={<EmConstrucao titulo="Contas a Receber" />} />
            <Route path="/relatorios" element={<EmConstrucao titulo="Relatórios" />} />
            <Route path="/configuracoes" element={<EmConstrucao titulo="Configurações" />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
