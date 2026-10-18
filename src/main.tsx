import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { registrarAtualizacaoPwa } from '@/lib/pwa'
import { prepararCallbackAuth } from '@/features/auth/authCallback'
import { z } from 'zod'

// Mensagens padrão de validação em português — nenhuma tela deve exibir
// "Invalid input" quando um campo não tem mensagem própria.
z.config(z.locales.pt())

// O app carregou e montou com sucesso — libera o guard de recarregamento
// automático do index.html (ver script inline em index.html) pra uma
// eventual falha futura, na mesma aba, poder tentar se recuperar de novo.
sessionStorage.removeItem('nexlab-recarregou-apos-falha')

async function iniciarApp() {
  await prepararCallbackAuth()
  registrarAtualizacaoPwa()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

void iniciarApp()
