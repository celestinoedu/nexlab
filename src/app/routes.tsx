import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ProtectedRoute } from '@/app/layout/ProtectedRoute'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EmConstrucao } from '@/components/shared/EmConstrucao'

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/demandas"
              element={
                <EmConstrucao
                  titulo="Demandas"
                  descricao="O quadro Kanban e a Lista de demandas chegam na próxima etapa do projeto."
                />
              }
            />
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
