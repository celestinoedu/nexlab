import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { baixarBlob } from '@/lib/download'
import { format, parseISO } from 'date-fns'
import { ARCO_LABEL, valorEfetivoItem, type OrdemServicoComRelacoes } from '@/types/domain'
import type { EmpresaConfig } from '@/hooks/useEmpresaConfig'

/**
 * Grade fixa por página — nunca varia conforme o conteúdo, exatamente para
 * garantir que uma OS nunca fique "cortada" entre duas colunas/linhas: cada
 * canhoto ocupa sempre uma célula inteira de medida fixa da grade (4 por
 * folha A4: 2 colunas × 2 linhas), nunca metade de uma.
 *
 * Tipografia obrigatória (impressora deixava o texto ilegível quando pequeno
 * demais): título 18pt, corpo 12pt (negrito nos dados importantes), rodapé
 * 10pt, sempre preto. Não existe um quarto tamanho "de rótulo" menor — por
 * isso rótulo e valor ficam na mesma linha ("Cliente: Fulano"), em vez do
 * layout anterior de rótulo pequeno numa linha e valor em outra.
 */
const COLUNAS = 2
const LINHAS = 2
const POR_PAGINA = COLUNAS * LINHAS
// A4 = 595,28 × 841,89 pt. Descontando os 18 pt de margem em cada lado,
// cada posição da grade 2 × 2 mede exatamente metade da área útil.
const CANHOTO_LARGURA = (595.28 - 18 * 2) / COLUNAS
const CANHOTO_ALTURA = (841.89 - 18 * 2) / LINHAS
const MAX_ITENS_LISTADOS = 3
const MAX_CHARS_OBSERVACAO = 55

const PRETO = '#000000'

const styles = StyleSheet.create({
  page: { padding: 18, fontFamily: 'Helvetica', color: PRETO },
  grade: { flexDirection: 'column', flex: 1 },
  // wrap={false}: se uma linha não couber no espaço restante da página,
  // o react-pdf empurra a linha inteira pra próxima página — nunca corta
  // uma OS no meio.
  linha: {
    flexDirection: 'row',
    width: CANHOTO_LARGURA * COLUNAS,
    height: CANHOTO_ALTURA,
    flexGrow: 0,
    flexShrink: 0,
  },
  canhoto: {
    width: CANHOTO_LARGURA,
    height: CANHOTO_ALTURA,
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    padding: 10,
    justifyContent: 'space-between',
    // Overflow escondido: se o conteúdo de um canhoto for excepcionalmente
    // longo (observação enorme, muitos serviços), ele nunca vaza pro
    // canhoto vizinho ou pra próxima página — só é cortado visualmente
    // dentro da própria célula, que já tem tamanho generoso para o caso comum.
    // A própria borda tracejada da célula já funciona como marcação de corte
    // (dispensa uma linha de texto "✂ - - -" separada, que não cabia mais
    // no espaço com a fonte obrigatória de 12pt).
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
  tituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  numeroOs: { fontSize: 18, fontWeight: 700, color: PRETO },
  copia: { fontSize: 10, color: PRETO },
  linhaCorpo: { fontSize: 12, color: PRETO, marginTop: 2 },
  rotulo: { fontSize: 12, fontWeight: 400, color: PRETO },
  valorForte: { fontSize: 12, fontWeight: 700, color: PRETO },
  servicosBloco: { marginTop: 4, borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 3 },
  itemLinha: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  itemNome: { fontSize: 12, color: PRETO, flex: 1, marginRight: 4 },
  itemValor: { fontSize: 12, fontWeight: 700, color: PRETO },
  itemExtra: { fontSize: 12, color: PRETO, marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  totalLabel: { fontSize: 12, color: PRETO },
  totalValor: { fontSize: 12, fontWeight: 700, color: PRETO },
  observacoes: { fontSize: 12, color: PRETO, marginTop: 4 },
  rodape: { marginTop: 5, borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 3 },
  datasRow: { flexDirection: 'row', justifyContent: 'space-between' },
  data: { fontSize: 10, color: PRETO },
  marca: { fontSize: 10, color: PRETO, textAlign: 'right', marginTop: 2 },
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
                        <View style={styles.tituloRow}>
                          <Text style={styles.numeroOs}>OS Nº {ordem.numero_os}</Text>
                          {totalCopias > 1 && (
                            <Text style={styles.copia}>Via {copia} de {totalCopias}</Text>
                          )}
                        </View>

                        <Text style={styles.linhaCorpo}>
                          <Text style={styles.rotulo}>{ehParceiro ? 'Parceiro: ' : 'Cliente: '}</Text>
                          <Text style={styles.valorForte}>{ordem.entidade.nome}</Text>
                        </Text>
                        {(ordem.cliente_final || ordem.nome_paciente) && (
                          <Text style={styles.linhaCorpo}>
                            <Text style={styles.rotulo}>Paciente: </Text>
                            <Text style={styles.valorForte}>
                              {[ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ')}
                            </Text>
                          </Text>
                        )}

                        <View style={styles.servicosBloco}>
                          {itensExibidos.map((item) => (
                            <View key={item.id} style={styles.itemLinha}>
                              <Text style={styles.itemNome}>
                                {item.servico.nome}
                                {(item.cor || item.arco) &&
                                  `  (${[item.cor, item.arco ? ARCO_LABEL[item.arco] : null].filter(Boolean).join(' · ')})`}
                                {item.quantidade > 1 && ` x${item.quantidade}`}
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
  baixarBlob(blob, `canhotos-os-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`)
}
