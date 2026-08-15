import * as React from 'react'
import { Plus, Search, Loader2, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { baixarCsv, formatarNumeroCsv } from '@/lib/csv'
import { useServicos } from '@/hooks/useServicos'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { ServicoFormDialog } from './components/ServicoFormDialog'
import type { Servico } from '@/types/domain'

export function ServicosPage() {
  const { data: servicos, isLoading } = useServicos(true)
  const { data: empresaConfig } = useEmpresaConfig()
  const [busca, setBusca] = React.useState('')
  const [categoriaFiltro, setCategoriaFiltro] = React.useState('todas')
  const [mostrarInativos, setMostrarInativos] = React.useState(false)
  const [dialogAberto, setDialogAberto] = React.useState(false)
  const [servicoSelecionado, setServicoSelecionado] = React.useState<Servico | null>(null)
  const [gerandoPdf, setGerandoPdf] = React.useState(false)

  const categorias = React.useMemo(() => {
    const set = new Set<string>()
    for (const s of servicos ?? []) if (s.categoria) set.add(s.categoria)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [servicos])

  const filtrados = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return (servicos ?? []).filter((s) => {
      if (categoriaFiltro !== 'todas' && s.categoria !== categoriaFiltro) return false
      if (!mostrarInativos && !s.ativo) return false
      if (!buscaLower) return true
      return s.nome.toLowerCase().includes(buscaLower)
    })
  }, [servicos, busca, categoriaFiltro, mostrarInativos])

  function abrirNovo() {
    setServicoSelecionado(null)
    setDialogAberto(true)
  }

  function abrirEdicao(servico: Servico) {
    setServicoSelecionado(servico)
    setDialogAberto(true)
  }

  function baixarCsvServicos() {
    const linhas: (string | number)[][] = [
      ['Serviço', 'Categoria', 'Preço padrão', 'Tempo médio (dias)', 'Situação'],
      ...filtrados.map((s) => [
        s.nome,
        s.categoria || '',
        formatarNumeroCsv(s.preco_padrao),
        s.tempo_medio_dias ?? '',
        s.ativo ? 'Ativo' : 'Inativo',
      ]),
    ]
    baixarCsv('catalogo-servicos.csv', linhas)
  }

  async function baixarCatalogoPdf() {
    setGerandoPdf(true)
    try {
      // Import dinâmico: @react-pdf/renderer é pesada e só é necessária
      // quando alguém realmente gera o PDF — mantém fora do bundle inicial.
      const { baixarCatalogoServicosPdf } = await import('./components/CatalogoServicosPdf')
      await baixarCatalogoServicosPdf(servicos ?? [], empresaConfig)
    } catch {
      toast.error('Não foi possível gerar o catálogo agora. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Catálogo de Serviços</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={baixarCatalogoPdf} disabled={(servicos ?? []).length === 0 || gerandoPdf}>
            {gerandoPdf ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            Baixar catálogo (PDF)
          </Button>
          <Button variant="secondary" onClick={baixarCsvServicos} disabled={filtrados.length === 0}>
            <Download size={18} />
            Baixar CSV
          </Button>
          <Button onClick={abrirNovo}>
            <Plus size={18} />
            Novo serviço
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar serviço..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
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
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum serviço encontrado com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Preço padrão</th>
                <th className="px-4 py-3 text-right">Tempo médio</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((servico) => (
                <tr
                  key={servico.id}
                  onClick={() => abrirEdicao(servico)}
                  className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{servico.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{servico.categoria || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {servico.preco_padrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {servico.tempo_medio_dias ? `${servico.tempo_medio_dias} dias` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={servico.ativo ? 'success' : 'neutral'}>
                      {servico.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServicoFormDialog open={dialogAberto} onOpenChange={setDialogAberto} servico={servicoSelecionado} />
    </div>
  )
}
