import * as React from 'react'
import { Plus, Search, Loader2, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useEntidades } from '@/hooks/useEntidades'
import { EntidadeFormDialog } from './components/EntidadeFormDialog'
import { TabelaPrecosDialog } from './components/TabelaPrecosDialog'
import type { Entidade, TipoEntidade } from '@/types/domain'

type FiltroTipo = 'todos' | TipoEntidade

export function EntidadesPage() {
  const { data: entidades, isLoading } = useEntidades(undefined, true)
  const [busca, setBusca] = React.useState('')
  const [tipoFiltro, setTipoFiltro] = React.useState<FiltroTipo>('todos')
  const [mostrarInativos, setMostrarInativos] = React.useState(false)
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [precosAberto, setPrecosAberto] = React.useState(false)
  const [entidadeSelecionada, setEntidadeSelecionada] = React.useState<Entidade | null>(null)

  const filtradas = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (entidades ?? []).filter((e) => {
      if (tipoFiltro !== 'todos' && e.tipo !== tipoFiltro) return false
      if (!mostrarInativos && !e.ativo) return false
      if (!buscaLower) return true
      return (
        e.nome.toLowerCase().includes(buscaLower) ||
        (e.documento ?? '').toLowerCase().includes(buscaLower) ||
        (e.email ?? '').toLowerCase().includes(buscaLower)
      )
    })
  }, [entidades, busca, tipoFiltro, mostrarInativos])

  function abrirNovo() {
    setEntidadeSelecionada(null)
    setDialogAberto(true)
  }

  function abrirEdicao(entidade: Entidade) {
    setEntidadeSelecionada(entidade)
    setDialogAberto(true)
  }

  function abrirPrecos(e: React.MouseEvent, entidade: Entidade) {
    e.stopPropagation()
    setEntidadeSelecionada(entidade)
    setPrecosAberto(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes e Parceiros</h1>
        <Button onClick={abrirNovo}>
          <Plus size={18} />
          Novo cadastro
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome, documento, e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['todos', 'cliente', 'parceiro'] as const).map((opcao) => (
            <button
              key={opcao}
              onClick={() => setTipoFiltro(opcao)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                tipoFiltro === opcao
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {opcao === 'todos' ? 'Todos' : opcao === 'cliente' ? 'Clientes' : 'Parceiros'}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
          />
          Mostrar inativos
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum cadastro encontrado com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((entidade) => (
                <tr
                  key={entidade.id}
                  onClick={() => abrirEdicao(entidade)}
                  className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{entidade.nome}</td>
                  <td className="px-4 py-3">
                    <Badge variant={entidade.tipo === 'parceiro' ? 'brand' : 'neutral'}>
                      {entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{entidade.documento || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {[entidade.telefone, entidade.email].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={entidade.ativo ? 'success' : 'neutral'}>
                      {entidade.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => abrirPrecos(e, entidade)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Tabela de preços"
                      title="Tabela de preços"
                    >
                      <Wallet size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EntidadeFormDialog open={dialogAberto} onOpenChange={setDialogAberto} entidade={entidadeSelecionada} />
      <TabelaPrecosDialog open={precosAberto} onOpenChange={setPrecosAberto} entidade={entidadeSelecionada} />
    </div>
  )
}
