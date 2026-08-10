import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDespesas } from './hooks/useDespesas'
import { DespesaFormDialog } from './components/DespesaFormDialog'
import type { Despesa } from '@/types/domain'

export function DespesasPage() {
  const { data: despesas, isLoading } = useDespesas()
  const [busca, setBusca] = React.useState('')
  const [categoriaFiltro, setCategoriaFiltro] = React.useState('todas')
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [despesaSelecionada, setDespesaSelecionada] = React.useState<Despesa | null>(null)

  const categorias = React.useMemo(() => {
    const set = new Set<string>()
    for (const d of despesas ?? []) if (d.categoria) set.add(d.categoria)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [despesas])

  const filtradas = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (despesas ?? []).filter((d) => {
      if (categoriaFiltro !== 'todas' && d.categoria !== categoriaFiltro) return false
      if (!buscaLower) return true
      return d.descricao.toLowerCase().includes(buscaLower)
    })
  }, [despesas, busca, categoriaFiltro])

  const totalFiltrado = filtradas.reduce((acc, d) => acc + d.valor, 0)

  function abrirNova() {
    setDespesaSelecionada(null)
    setDialogAberto(true)
  }

  function abrirEdicao(despesa: Despesa) {
    setDespesaSelecionada(despesa)
    setDialogAberto(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Despesas</h1>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 px-4 py-2 text-right">
            <span className="block text-xs font-medium text-brand-700">Total (filtro atual)</span>
            <span className="text-lg font-semibold text-brand-900">
              {totalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <Button onClick={abrirNova}>
            <Plus size={18} />
            Nova despesa
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              categoriaFiltro === 'todas'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            Todas
          </button>
          {categorias.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setCategoriaFiltro(categoria)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                categoriaFiltro === categoria
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {categoria}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhuma despesa encontrada com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((despesa) => (
                <tr
                  key={despesa.id}
                  onClick={() => abrirEdicao(despesa)}
                  className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{despesa.descricao}</td>
                  <td className="px-4 py-3 text-slate-500">{despesa.categoria || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(parseISO(despesa.data_despesa), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DespesaFormDialog open={dialogAberto} onOpenChange={setDialogAberto} despesa={despesaSelecionada} />
    </div>
  )
}
