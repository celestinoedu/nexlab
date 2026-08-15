import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Servico } from '@/types/domain'
import type { EmpresaConfig } from '@/hooks/useEmpresaConfig'

/** Catálogo tem validade fixa de 20 dias a partir da emissão — regra de negócio pedida pelo cliente. */
const DIAS_VALIDADE = 20

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: '#1e293b', fontFamily: 'Helvetica' },
  // Moldura ao redor de toda a página, conforme pedido ("com borda").
  moldura: { flex: 1, borderWidth: 1, borderColor: '#334155', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  empresaBloco: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, objectFit: 'contain' },
  empresaNome: { fontSize: 16, fontWeight: 700, color: '#0a4f4d' },
  empresaLinha: { fontSize: 9, color: '#64748b' },
  tituloDireita: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  subtituloDireita: { fontSize: 9, color: '#64748b', textAlign: 'right' },
  categoriaBloco: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoriaTitulo: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 10,
    fontWeight: 700,
    color: '#0a4f4d',
    textTransform: 'uppercase',
  },
  linhaServico: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  nomeServico: { fontSize: 9.5, color: '#1e293b', flex: 1, marginRight: 8 },
  precoServico: { fontSize: 9.5, fontWeight: 700, color: '#0a4f4d' },
  notaValidade: {
    marginTop: 8,
    fontSize: 8.5,
    color: '#475569',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  rodape: { position: 'absolute', bottom: 24, left: 32, right: 32, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

interface CatalogoServicosPdfDocumentProps {
  servicos: Servico[]
  empresa: EmpresaConfig | undefined
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function agruparPorCategoria(servicos: Servico[]): [string, Servico[]][] {
  const grupos = new Map<string, Servico[]>()
  for (const servico of servicos) {
    const categoria = servico.categoria || 'Outros'
    if (!grupos.has(categoria)) grupos.set(categoria, [])
    grupos.get(categoria)!.push(servico)
  }
  return Array.from(grupos.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([categoria, itens]) => [categoria, [...itens].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))])
}

export function CatalogoServicosPdfDocument({ servicos, empresa }: CatalogoServicosPdfDocumentProps) {
  const hoje = new Date()
  const validoAte = addDays(hoje, DIAS_VALIDADE)
  const categorias = agruparPorCategoria(servicos.filter((s) => s.ativo))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.moldura}>
          <View style={styles.headerRow}>
            <View style={styles.empresaBloco}>
              {empresa?.mostrar_logo && empresa.logo_url && (
                <Image style={styles.logo} src={empresa.logo_url} />
              )}
              <View>
                <Text style={styles.empresaNome}>{empresa?.nome_fantasia ?? 'NexLab'}</Text>
                {empresa?.mostrar_telefone && empresa.telefone && (
                  <Text style={styles.empresaLinha}>{empresa.telefone}</Text>
                )}
                {empresa?.mostrar_email && empresa.email && (
                  <Text style={styles.empresaLinha}>{empresa.email}</Text>
                )}
                {empresa?.mostrar_endereco && empresa.endereco && (
                  <Text style={styles.empresaLinha}>{empresa.endereco}</Text>
                )}
              </View>
            </View>
            <View>
              <Text style={styles.tituloDireita}>Catálogo de Serviços</Text>
              <Text style={styles.subtituloDireita}>
                Emitido em {format(hoje, "dd/MM/yyyy", { locale: ptBR })}
              </Text>
            </View>
          </View>

          {categorias.map(([categoria, itens]) => (
            <View key={categoria} style={styles.categoriaBloco} wrap={false}>
              <Text style={styles.categoriaTitulo}>{categoria}</Text>
              {itens.map((servico) => (
                <View key={servico.id} style={styles.linhaServico}>
                  <Text style={styles.nomeServico}>{servico.nome}</Text>
                  <Text style={styles.precoServico}>{formatarMoeda(servico.preco_padrao)}</Text>
                </View>
              ))}
            </View>
          ))}

          <Text style={styles.notaValidade}>
            Os preços e condições deste catálogo possuem validade de {DIAS_VALIDADE} dias a partir da emissão
            (válido até {format(validoAte, 'dd/MM/yyyy', { locale: ptBR })}), consulte nosso laboratório para
            obter uma versão atualizada.
          </Text>
        </View>

        <Text style={styles.rodape} fixed>
          Documento gerado pelo NexLab em {format(hoje, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — sem valor
          fiscal.
        </Text>
      </Page>
    </Document>
  )
}

/** Gera o catálogo de serviços em PDF (só ativos, agrupados por categoria) e baixa como arquivo. */
export async function baixarCatalogoServicosPdf(servicos: Servico[], empresa: EmpresaConfig | undefined) {
  const blob = await pdf(<CatalogoServicosPdfDocument servicos={servicos} empresa={empresa} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `catalogo-servicos-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
