import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { ARCO_LABEL, valorEfetivoItem, type OrdemServicoComRelacoes } from '@/types/domain'
import type { EmpresaConfig } from '@/hooks/useEmpresaConfig'

/**
 * Grade fixa por página — nunca varia conforme o conteúdo, exatamente para
 * garantir que uma OS nunca fique "cortada" entre duas colunas/linhas: cada
 * canhoto ocupa sempre uma célula inteira da grade, nunca metade de uma.
 */
const COLUNAS = 2
const LINHAS = 3
const POR_PAGINA = COLUNAS * LINHAS
const MAX_ITENS_LISTADOS = 4
const MAX_CHARS_OBSERVACAO = 110

const styles = StyleSheet.create({
  page: { padding: 18, fontFamily: 'Helvetica' },
  grade: { flexDirection: 'column', flex: 1 },
  // wrap={false}: se uma linha não couber no espaço restante da página,
  // o react-pdf empurra a linha inteira pra próxima página — nunca corta
  // uma OS no meio.
  linha: { flexDirection: 'row', flex: 1 },
  canhoto: {
    width: `${100 / COLUNAS}%`,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    padding: 10,
    justifyContent: 'space-between',
    // Overflow escondido: se o conteúdo de um canhoto for excepcionalmente
    // longo (observação enorme, muitos serviços), ele nunca vaza pro
    // canhoto vizinho ou pra próxima página — só é cortado visualmente
    // dentro da própria célula, que já tem tamanho generoso para o caso comum.
    overflow: 'hidden',
  },
  marcaDagua: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaDaguaImg: { width: '55%', opacity: 0.08 },
  tesoura: { fontSize: 8, color: '#94a3b8', marginBottom: 3 },
  numeroOs: { fontSize: 15, fontWeight: 700, color: '#0a4f4d' },
  copia: { fontSize: 7, color: '#94a3b8' },
  linhaInfo: { marginTop: 4 },
  label: { fontSize: 6.5, color: '#94a3b8', textTransform: 'uppercase' },
  valor: { fontSize: 8.5, fontWeight: 700, color: '#1e293b' },
  servicosBloco: { marginTop: 4 },
  itemLinha: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  itemNome: { fontSize: 7.5, color: '#334155', flex: 1, marginRight: 4 },
  itemDetalhe: { fontSize: 6.5, color: '#94a3b8' },
  itemValor: { fontSize: 7.5, fontWeight: 700, color: '#1e293b' },
  itemExtra: { fontSize: 7, color: '#94a3b8', marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: { fontSize: 7.5, color: '#64748b' },
  totalValor: { fontSize: 10, fontWeight: 700, color: '#0a4f4d' },
  observacoes: { fontSize: 7, color: '#475569', marginTop: 4 },
  rodape: { marginTop: 5 },
  datasRow: { flexDirection: 'row', justifyContent: 'space-between' },
  data: { fontSize: 6.5, color: '#64748b' },
  marca: { fontSize: 6.5, color: '#cbd5e1', textAlign: 'right', marginTop: 2 },
})

interface CanhotoItem {
  ordem: OrdemServicoComRelacoes
  copia: number
  totalCopias: number
}

interface CanhotosPdfDocumentProps {
  itens: CanhotoItem[]
  empresaNome: string
  logoUrl?: string | null
}

function formatarData(data: string | null) {
  return data ? format(parseISO(data), 'dd/MM/yyyy') : '—'
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function truncarObservacao(texto: string) {
  if (texto.length <= MAX_CHARS_OBSERVACAO) return texto
  return `${texto.slice(0, MAX_CHARS_OBSERVACAO).trimEnd()}…`
}

function agrupar<T>(lista: T[], tamanho: number): T[][] {
  const grupos: T[][] = []
  for (let i = 0; i < lista.length; i += tamanho) grupos.push(lista.slice(i, i + tamanho))
  return grupos
}

export function CanhotosPdfDocument({ itens, empresaNome, logoUrl }: CanhotosPdfDocumentProps) {
  const paginas = agrupar(itens, POR_PAGINA)

  return (
    <Document>
      {paginas.map((pagina, indicePagina) => (
        // eslint-disable-next-line react/no-array-index-key
        <Page key={indicePagina} size="A4" style={styles.page}>
          <View style={styles.grade}>
            {agrupar(pagina, COLUNAS).map((linha, indiceLinha) => (
              // eslint-disable-next-line react/no-array-index-key
              <View key={indiceLinha} style={styles.linha} wrap={false}>
                {linha.map(({ ordem, copia, totalCopias }) => {
                  const ehParceiro = ordem.entidade.tipo === 'parceiro'
                  const subtotal = ordem.itens.reduce(
                    (acc, item) => acc + valorEfetivoItem(item, ordem.entidade.tipo),
                    0,
                  )
                  const total = subtotal - ordem.desconto
                  const itensExibidos = ordem.itens.slice(0, MAX_ITENS_LISTADOS)
                  const itensRestantes = ordem.itens.length - itensExibidos.length

                  return (
                    <View key={`${ordem.id}-${copia}`} style={styles.canhoto}>
                      {logoUrl && (
                        <View style={styles.marcaDagua}>
                          <Image style={styles.marcaDaguaImg} src={logoUrl} />
                        </View>
                      )}
                      <View>
                        <Text style={styles.tesoura}>✂ - - - - - - - - - - - - - - - - - - -</Text>
                        <Text style={styles.numeroOs}>OS Nº {ordem.numero_os}</Text>
                        {totalCopias > 1 && (
                          <Text style={styles.copia}>Via {copia} de {totalCopias}</Text>
                        )}
                        <View style={styles.linhaInfo}>
                          <Text style={styles.label}>{ehParceiro ? 'Parceiro' : 'Cliente'}</Text>
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

                        <View style={styles.servicosBloco}>
                          <Text style={styles.label}>{ehParceiro ? 'Serviços / Comissão' : 'Serviços / Valor'}</Text>
                          {itensExibidos.map((item) => (
                            <View key={item.id} style={styles.itemLinha}>
                              <Text style={styles.itemNome}>
                                {item.servico.nome}
                                {(item.cor || item.arco) && (
                                  <Text style={styles.itemDetalhe}>
                                    {'  ('}
                                    {[item.cor, item.arco ? ARCO_LABEL[item.arco] : null]
                                      .filter(Boolean)
                                      .join(' · ')}
                                    {')'}
                                  </Text>
                                )}
                                {item.quantidade > 1 && (
                                  <Text style={styles.itemDetalhe}> x{item.quantidade}</Text>
                                )}
                              </Text>
                              <Text style={styles.itemValor}>
                                {formatarMoeda(valorEfetivoItem(item, ordem.entidade.tipo))}
                              </Text>
                            </View>
                          ))}
                          {itensRestantes > 0 && (
                            <Text style={styles.itemExtra}>+{itensRestantes} outro(s) serviço(s)</Text>
                          )}
                        </View>

                        <View style={styles.totalRow}>
                          {ordem.desconto > 0 && (
                            <Text style={styles.totalLabel}>Desc.: {formatarMoeda(ordem.desconto)}</Text>
                          )}
                          <Text style={styles.totalLabel}>Total:</Text>
                          <Text style={styles.totalValor}>{formatarMoeda(total)}</Text>
                        </View>

                        {ordem.observacoes && (
                          <Text style={styles.observacoes}>Obs.: {truncarObservacao(ordem.observacoes)}</Text>
                        )}
                      </View>

                      <View style={styles.rodape}>
                        <View style={styles.datasRow}>
                          <Text style={styles.data}>Receb.: {formatarData(ordem.data_recebimento)}</Text>
                          <Text style={styles.data}>
                            Entrega: {formatarData(ordem.data_entrega ?? ordem.data_prevista)}
                          </Text>
                        </View>
                        <Text style={styles.marca}>{empresaNome}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}

/**
 * Gera o PDF com um canhoto por via de cada OS selecionada (`quantidades`
 * controla quantas vias de cada uma entram), distribuídos numa grade fixa de
 * {@link COLUNAS}×{@link LINHAS} por página A4 — nunca divide uma via entre
 * duas páginas — e baixa como arquivo único.
 */
export async function baixarCanhotosPdf(
  ordens: OrdemServicoComRelacoes[],
  quantidades: Record<string, number>,
  empresa: EmpresaConfig | undefined,
) {
  const ordenadas = [...ordens].sort((a, b) => a.numero_os - b.numero_os)
  const itens: CanhotoItem[] = []
  for (const ordem of ordenadas) {
    const totalCopias = Math.max(1, Math.round(quantidades[ordem.id] ?? 1))
    for (let copia = 1; copia <= totalCopias; copia += 1) {
      itens.push({ ordem, copia, totalCopias })
    }
  }

  const empresaNome = empresa?.nome_fantasia || 'NexLab'
  const logoUrl = empresa?.mostrar_logo ? empresa.logo_url : null

  const blob = await pdf(
    <CanhotosPdfDocument itens={itens} empresaNome={empresaNome} logoUrl={logoUrl} />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `canhotos-os-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
