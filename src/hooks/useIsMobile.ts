import * as React from 'react'

// Mesmo breakpoint das classes Tailwind `md:` usadas no layout (768px —
// ver `Sidebar.tsx`/`MobileNav.tsx`, `md:hidden`/`md:flex`). Usar aqui pra
// manter os dois em sincronia: mudou um, muda o outro.
const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)'

/**
 * Pra decisões de **conteúdo** que mudam por tamanho de tela (não só
 * estilo, que é sempre CSS/Tailwind) — ex.: qual componente é a tela
 * inicial ("/") no celular vs. computador, ver `routes.tsx`.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
    function ouvirMudanca(evento: MediaQueryListEvent) {
      setIsMobile(evento.matches)
    }
    mql.addEventListener('change', ouvirMudanca)
    return () => mql.removeEventListener('change', ouvirMudanca)
  }, [])

  return isMobile
}
