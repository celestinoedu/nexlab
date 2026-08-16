import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  iconOnly?: boolean
  variant?: 'primary' | 'reverse' | 'monochrome'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Wordmark v1 do NexLab (ver docs/design-system.md, seção 7) — marca do
 * produto, a mesma pra todo cliente. O logo de cada laboratório (por
 * empresa/tenant) é outra coisa: aparece à parte no Topbar e nos PDFs,
 * vindo de `empresas.logo_url` (ver `EmpresaConfigDialog`).
 */
const SIZE = {
  sm: { icon: 28, text: 'text-lg', gap: 'gap-2' },
  md: { icon: 36, text: 'text-2xl', gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-3xl', gap: 'gap-3' },
} as const

export function Logo({ className, iconOnly = false, variant = 'primary', size = 'sm' }: LogoProps) {
  const config = SIZE[size]
  const reverse = variant === 'reverse'
  const monochrome = variant === 'monochrome'

  return (
    <div className={cn('flex items-center', config.gap, className)} aria-label="NexLab">
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="26"
          height="26"
          rx="8"
          className={cn(reverse ? 'fill-brand-500' : monochrome ? 'fill-ink' : 'fill-brand-600')}
        />
        <path
          d="M8 19V9L15.5 16.5V9"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.5 9.5L20.5 11.5L18.5 12.5L20.5 13.5L19.5 15.5"
          className={monochrome ? 'stroke-white' : 'stroke-amber-500'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span className={cn(config.text, 'font-bold tracking-[-0.045em]', reverse ? 'text-white' : 'text-ink')}>
          <span className={reverse || monochrome ? undefined : 'text-brand-600'}>Nex</span>Lab
        </span>
      )}
    </div>
  )
}
