import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { STATUS_OS_LABEL, type OrdemServicoComRelacoes } from '@/types/domain'

/**
 * Grade fixa por página — nunca varia conforme o conteúdo, exatamente para
 * garantir que uma OS nunca fique "cortada" entre duas colunas/linhas: cada
 * canhoto ocupa sempre uma célula inteira da grade, nunca metade de uma.
 */
const COLUNAS = 2
const LINHAS = 4
const POR_PAGINA = COLUNAS * LINHAS

const styles = StyleSheet.create({
  page: { padding: 18, fontFamily: 'Helvetica' },
  grade: { flexDirection: 'column', flex: 1 },
  linha: { flexDirection: 'row', flex: 1 },
  canhoto: {
    width: `${100 / COLUNAS}%`,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    padding: 10,
    justifyContent: 'space-between',
  },
  tesoura: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  numeroOs: { fontSize: 16, fontWeight: 700, color: '#0a4f4d' },
  status: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', maxWidth: '45%', textAlign: 'right' },
  linhaInfo: { marginTop: 5 },
  label: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' },
  valor: { fontSize: 9, fontWeight: 700, color: '#1e293b' },
  servicos: { fontSize: 8, color: '#475569', marginTop: 1 },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  data: { fontSize: 8, color: '#64748b' },
  marca: { fontSize: 7, color: '#cbd5e1' },
})

interface CanhotosPdfDocumentProps {
  ordens: OrdemServicoComRelacoes[]
}

function formatarData(data: string | null) {
  return data ? format(parseISO(data), 'dd/MM/yyyy') : '—'
}

function resumoServicos(ordem: OrdemServicoComRelacoes) {
  const nomes = ordem.itens.map((item) => item.servico.nome)
  if (nomes.length === 0) return '—'
  if (nomes.length <= 2) return nomes.join(', ')
  return `${nomes.slice(0, 2).join(', ')} +${nomes.length - 2}`
}

function agrupar<T>(itens: T[], tamanho: number): T[][] {
  const grupos: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) grupos.push(itens.slice(i, i + tamanho))
  return grupos
}

export function CanhotosPdfDocument({ ordens }: CanhotosPdfDocumentProps) {
  const paginas = agrupar(ordens, POR_PAGINA)

  return (
    <Document>
      {paginas.map((pagina, indicePagina) => (
        // eslint-disable-next-line react/no-array-index-key
        <Page key={indicePagina} size="A4" style={styles.page}>
          <View style={styles.grade}>
            {agrupar(pagina, COLUNAS).map((linha, indiceLinha) => (
              // eslint-disable-next-line react/no-array-index-key
              <View key={indiceLinha} style={styles.linha}>
                {linha.map((ordem) => (
                  <View key={ordem.id} style={styles.canhoto}>
                    <View>
                      <Text style={styles.tesoura}>✂ - - - - - - - - - - - - - - - - - - -</Text>
                      <View style={styles.topo}>
                        <Text style={styles.numeroOs}>OS Nº {ordem.numero_os}</Text>
                        <Text style={styles.status}>{STATUS_OS_LABEL[ordem.status]}</Text>
                      </View>
                      <View style={styles.linhaInfo}>
                        <Text style={styles.label}>
                          {ordem.entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                        </Text>
                        <Text style={styles.valor}>{ordem.entidade.nome}</Text>
                      </View>
                      {(ordem.cliente_final || ordem.nome_paciente) && (
                        <View style={styles.linhaInfo}>
                          <Text style={styles.label}>Cliente final / Paciente</Text>
                          <Text style={styles.valor}>
                            {[ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.linhaInfo}>
                        <Text style={styles.label}>Serviços</Text>
                        <Text style={styles.servicos}>{resumoServicos(ordem)}</Text>
                      </View>
                    </View>
                    <View style={styles.rodape}>
                      <Text style={styles.data}>
                        Entrega: {formatarData(ordem.data_entrega ?? ordem.data_prevista)}
                      </Text>
                      <Text style={styles.marca}>NexLab</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}

/**
 * Gera o PDF com um canhoto por OS selecionada, distribuídos numa grade fixa
 * de {@link COLUNAS}×{@link LINHAS} por página A4 — nunca divide uma OS entre
 * duas páginas — e baixa como arquivo único.
 */
export async function baixarCanhotosPdf(ordens: OrdemServicoComRelacoes[]) {
  const ordenadas = [...ordens].sort((a, b) => a.numero_os - b.numero_os)
  const blob = await pdf(<CanhotosPdfDocument ordens={ordenadas} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `canhotos-os-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
