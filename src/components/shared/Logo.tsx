import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  iconOnly?: boolean
}

/**
 * Wordmark v1 do NexLab (ver docs/design-system.md, seção 7).
 * Quando houver um logo definitivo do GRS Lab, substituir só este componente.
 */
export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="26" height="26" rx="8" className="fill-brand-600" />
        <path
          d="M8 19V9L15.5 16.5V9"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.5 9.5L20.5 11.5L18.5 12.5L20.5 13.5L19.5 15.5"
          stroke="#EE9524"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span className="text-lg font-bold tracking-tight text-slate-900">
          <span className="text-brand-600">Nex</span>Lab
        </span>
      )}
    </div>
  )
}
