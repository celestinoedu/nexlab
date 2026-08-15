import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Search, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { useInsumos } from './hooks/useInsumos'
import { useInsumoMutations } from './hooks/useInsumoMutations'
import { InsumoFormDialog } from './components/InsumoFormDialog'
import { ExcluirInsumoDialog } from './components/ExcluirInsumoDialog'
import type { Insumo } from '@/types/domain'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function EstoquePage() {
  const { data: insumos, isLoading } = useInsumos()
  const { data: profile } = useProfile()
  const { deleteInsumo } = useInsumoMutations()
  const podeExcluir = profile?.role === 'admin'

  const [busca, setBusca] = React.useState('')
  const [localFiltro, setLocalFiltro] = React.useState('todos')
  const [somenteSinalizados, setSomenteSinalizados] = React.useState(false)
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [insumoSelecionado, setInsumoSelecionado] = React.useState<Insumo | null>(null)
  const [insumoExcluindo, setInsumoExcluindo] = React.useState<Insumo | null>(null)

  const locais = React.useMemo(() => {
    const set = new Set<string>()
    for (const i of insumos ?? []) if (i.local_estoque) set.add(i.local_estoque)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [insumos])

  const filtrados = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (insumos ?? []).filter((i) => {
      if (localFiltro !== 'todos' && i.local_estoque !== localFiltro) return false
      if (somenteSinalizados && !i.sinalizar_compra) return false
      if (!buscaLower) return true
      return i.nome.toLowerCase().includes(buscaLower)
    })
  }, [insumos, busca, localFiltro, somenteSinalizados])

  const totalSinalizados = (insumos ?? []).filter((i) => i.sinalizar_compra).length

  function abrirNovo() {
    setInsumoSelecionado(null)
    setDialogAberto(true)
  }

  function abrirEdicao(insumo: Insumo) {
    setInsumoSelecionado(insumo)
    setDialogAberto(true)
  }

  async function confirmarExclusao() {
    if (!insumoExcluindo) return
    try {
      await deleteInsumo.mutateAsync(insumoExcluindo.id)
      toast.success('Insumo excluído.')
      setInsumoExcluindo(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir agora.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Estoque</h1>
        <Button onClick={abrirNovo}>
          <Plus size={18} />
          Novo insumo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar insumo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        {locais.length > 0 && (
          <select
            value={localFiltro}
            onChange={(e) => setLocalFiltro(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <option value="todos">Todos os locais</option>
            {locais.map((local) => (
              <option key={local} value={local}>
                {local}
              </option>
            ))}
          </select>
        )}

        <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300"
            checked={somenteSinalizados}
            onChange={(e) => setSomenteSinalizados(e.target.checked)}
          />
          Só sinalizados para compra {totalSinalizados > 0 && `(${totalSinalizados})`}
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum insumo encontrado com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3 text-right">Quantidade</th>
                <th className="px-4 py-3 text-right">Valor unitário</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((insumo) => (
                <tr
                  key={insumo.id}
                  onClick={() => abrirEdicao(insumo)}
                  className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{insumo.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{insumo.categoria || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{insumo.local_estoque || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {insumo.quantidade}
                    {insumo.unidade ? ` ${insumo.unidade}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatarMoeda(insumo.valor_unitario)}</td>
                  <td className="px-4 py-3">
                    {insumo.sinalizar_compra ? (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle size={12} />
                        Sinalizado p/ compra
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Ok</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {podeExcluir && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInsumoExcluindo(insumo)
                        }}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-100 hover:text-danger-700',
                        )}
                        aria-label="Excluir insumo"
                        title="Excluir insumo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InsumoFormDialog open={dialogAberto} onOpenChange={setDialogAberto} insumo={insumoSelecionado} />
      <ExcluirInsumoDialog
        open={Boolean(insumoExcluindo)}
        onOpenChange={(open) => !open && setInsumoExcluindo(null)}
        insumo={insumoExcluindo}
        onConfirm={confirmarExclusao}
        excluindo={deleteInsumo.isPending}
      />
    </div>
  )
}
