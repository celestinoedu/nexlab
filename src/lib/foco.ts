const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Move o foco para o campo anterior/seguinte, na mesma ordem de um Tab
 * nativo, dentro do modal em que a origem está (ou da página).
 */
export function focarCampoVizinho(origem: HTMLElement, direcao: 1 | -1) {
  const escopo = origem.closest('[role="dialog"]') ?? document.body
  const campos = Array.from(escopo.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
    (el) => el.tabIndex >= 0 && el.getClientRects().length > 0,
  )
  const alvo = campos[campos.indexOf(origem) + direcao]
  ;(alvo ?? origem).focus()
}
