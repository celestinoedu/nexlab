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
    onRegisterError(erro) {
      console.error('[PWA] falha ao registrar o service worker:', erro)
    },
  })
}
