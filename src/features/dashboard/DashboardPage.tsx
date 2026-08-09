import { ClipboardList, Users, Wallet } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent } from '@/components/ui/card'

export function DashboardPage() {
  const { user } = useAuth()
  const nome = user?.email?.split('@')[0] ?? ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Olá{nome ? `, ${nome}` : ''} 👋</h1>
        <p className="text-sm text-slate-500">Aqui está um resumo do GRS Lab.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumoCard
          icon={ClipboardList}
          label="Demandas em produção"
          valor="—"
          nota="Disponível quando o módulo de Demandas estiver pronto"
        />
        <ResumoCard
          icon={Wallet}
          label="A receber este mês"
          valor="—"
          nota="Disponível quando o módulo Financeiro estiver pronto"
        />
        <ResumoCard
          icon={Users}
          label="Clientes e Parceiros ativos"
          valor="—"
          nota="Disponível quando o cadastro estiver pronto"
        />
      </div>

      <Card>
        <CardContent className="py-6">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Fundação do sistema pronta</h2>
          <p className="text-sm text-slate-500">
            Login, layout e identidade visual do NexLab já estão no ar. Os módulos de Demandas,
            Clientes/Parceiros e Financeiro chegam nas próximas etapas — acompanhe o progresso em{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">docs/roadmap.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ResumoCard({
  icon: Icon,
  label,
  valor,
  nota,
}: {
  icon: typeof ClipboardList
  label: string
  valor: string
  nota: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
          <Icon className="text-brand-600" size={20} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{valor}</p>
        </div>
        <p className="text-xs text-slate-400">{nota}</p>
      </CardContent>
    </Card>
  )
}
