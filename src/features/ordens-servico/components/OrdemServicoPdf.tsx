import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ARCO_LABEL, STATUS_OS_LABEL, valorEfetivoItem, type OrdemServicoComRelacoes } from '@/types/domain'
import type { EmpresaConfig } from '@/hooks/useEmpresaConfig'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#1e293b', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  empresaNome: { fontSize: 16, fontWeight: 700, color: '#0a4f4d' },
  empresaLinha: { fontSize: 9, color: '#64748b' },
  osTitulo: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  osData: { fontSize: 9, color: '#64748b', textAlign: 'right' },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10, marginBottom: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 6 },
  infoLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase' },
  infoValor: { fontSize: 10, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  th: { fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  td: { fontSize: 9 },
  colServico: { width: '38%' },
  colCor: { width: '14%' },
  colArco: { width: '14%' },
  colQtd: { width: '10%', textAlign: 'right' },
  colValor: { width: '24%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValor: { fontSize: 13, fontWeight: 700, color: '#0a4f4d' },
  observacoes: { marginTop: 14, fontSize: 9, color: '#475569' },
  rodape: { position: 'absolute', bottom: 24, left: 32, right: 32, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

interface OrdemServicoPdfDocumentProps {
  ordem: OrdemServicoComRelacoes
  empresa: EmpresaConfig | undefined
}

function formatarData(data: string | null) {
  return data ? format(parseISO(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function OrdemServicoPdfDocument({ ordem, empresa }: OrdemServicoPdfDocumentProps) {
  const ehParceiro = ordem.entidade.tipo === 'parceiro'
  const subtotal = ordem.itens.reduce((acc, item) => acc + valorEfetivoItem(item, ordem.entidade.tipo), 0)
  const total = subtotal - ordem.desconto

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.empresaNome}>{empresa?.nome_fantasia ?? 'GRS Lab'}</Text>
            {empresa?.telefone && <Text style={styles.empresaLinha}>{empresa.telefone}</Text>}
            {empresa?.email && <Text style={styles.empresaLinha}>{empresa.email}</Text>}
            {empresa?.endereco && <Text style={styles.empresaLinha}>{empresa.endereco}</Text>}
          </View>
          <View>
            <Text style={styles.osTitulo}>Ordem de Serviço #{ordem.numero_os}</Text>
            <Text style={styles.osData}>Status: {STATUS_OS_LABEL[ordem.status]}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{ehParceiro ? 'Parceiro' : 'Cliente'}</Text>
              <Text style={styles.infoValor}>{ordem.entidade.nome}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cliente final / Paciente</Text>
              <Text style={styles.infoValor}>{ordem.cliente_final || '—'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data de recebimento</Text>
              <Text style={styles.infoValor}>{formatarData(ordem.data_recebimento)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data de entrega</Text>
              <Text style={styles.infoValor}>{formatarData(ordem.data_entrega ?? ordem.data_prevista)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colServico]}>Serviço</Text>
            <Text style={[styles.th, styles.colCor]}>Cor</Text>
            <Text style={[styles.th, styles.colArco]}>Arco</Text>
            <Text style={[styles.th, styles.colQtd]}>Qtd</Text>
            <Text style={[styles.th, styles.colValor]}>{ehParceiro ? 'Comissão' : 'Valor'}</Text>
          </View>
          {ordem.itens.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.colServico]}>{item.servico.nome}</Text>
              <Text style={[styles.td, styles.colCor]}>{item.cor || '—'}</Text>
              <Text style={[styles.td, styles.colArco]}>{item.arco ? ARCO_LABEL[item.arco] : '—'}</Text>
              <Text style={[styles.td, styles.colQtd]}>{item.quantidade}</Text>
              <Text style={[styles.td, styles.colValor]}>
                {formatarMoeda(valorEfetivoItem(item, ordem.entidade.tipo))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          {ordem.desconto > 0 && (
            <Text style={styles.totalLabel}>Desconto: {formatarMoeda(ordem.desconto)}</Text>
          )}
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValor}>{formatarMoeda(total)}</Text>
        </View>

        {ordem.observacoes && (
          <View style={styles.observacoes}>
            <Text style={styles.infoLabel}>Observações</Text>
            <Text>{ordem.observacoes}</Text>
          </View>
        )}

        <Text style={styles.rodape}>
          Documento gerado pelo NexLab em{' '}
          {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — sem valor fiscal.
        </Text>
      </Page>
    </Document>
  )
}

/** Gera o PDF da OS em memória e baixa como arquivo (sempre download, não abre em nova aba). */
export async function baixarPdfOrdemServico(
  ordem: OrdemServicoComRelacoes,
  empresa: EmpresaConfig | undefined,
) {
  const blob = await pdf(<OrdemServicoPdfDocument ordem={ordem} empresa={empresa} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `OS-${ordem.numero_os}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
