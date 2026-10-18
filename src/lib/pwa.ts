import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

/**
 * Registra o service worker do PWA (gerado pelo vite-plugin-pwa a partir
 * de `vite.config.ts`) e avisa quando há uma versão nova pronta, via
 * toast — nunca troca sozinho no meio de uma tela aberta
 * (`registerType: 'prompt'`): só ativa quando o usuário clicar em
 * "Atualizar". Chamado uma vez, em `main.tsx`.
 */
export function registrarAtualizacaoPwa() {
  const atualizarAgora = registerSW({
    onNeedRefresh() {
      toast('Nova versão do NexLab disponível.', {
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => atualizarAgora(true),
        },
      })
    },
    // O navegador só procura um service worker novo ao carregar a página.
    // Quem deixa o NexLab aberto (ou instalado) o dia todo nunca veria o aviso
    // de versão nova; por isso verifica a cada 30 min e ao voltar para a aba.
    onRegisteredSW(_url, registro) {
      if (!registro) return
      const verificar = () => {
        if (navigator.onLine) registro.update().catch(() => {})
      }
      setInterval(verificar, 30 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') verificar()
      })
    },
    onRegisterError(erro) {
      console.error('[PWA] falha ao registrar o service worker:', erro)
    },
  })
}
