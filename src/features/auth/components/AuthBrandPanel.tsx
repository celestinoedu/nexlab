import { Check, Sparkles } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

const BENEFICIOS = ['Operação em um só fluxo', 'Financeiro sob controle', 'Decisões com mais clareza']

export function AuthBrandPanel() {
  return (
    <section className="auth-brand-panel relative hidden min-h-screen overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <Logo variant="reverse" size="lg" className="relative z-10" />

      <div className="relative z-10 max-w-xl">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-300/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand-100 backdrop-blur-sm">
          <Sparkles size={14} className="text-amber-400" />
          Gestão inteligente para laboratórios
        </span>
        <h1 className="text-5xl font-bold leading-[1.02] tracking-[-0.055em] xl:text-6xl">
          Gestão que <span className="text-brand-300">conecta.</span>
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-brand-100">
          Clareza para organizar a rotina, acompanhar resultados e fazer o seu laboratório avançar.
        </p>
        <ul className="mt-9 grid gap-3 text-sm text-white/85">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio} className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-brand-300/15 text-brand-200">
                <Check size={14} strokeWidth={2.5} />
              </span>
              {beneficio}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs font-medium tracking-[0.08em] text-brand-200/70 uppercase">
        NexLab · Precisão com proximidade
      </p>
    </section>
  )
}
