import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { valorTotalOrdem, type Entidade, type OrdemServicoComRelacoes } from '@/types/domain'
import type { EmpresaConfig } from '@/hooks/useEmpresaConfig'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#1e293b', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  empresaBloco: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, objectFit: 'contain' },
  empresaNome: { fontSize: 16, fontWeight: 700, color: '#0a4f4d' },
  empresaLinha: { fontSize: 9, color: '#64748b' },
  tituloDireita: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  subtituloDireita: { fontSize: 9, color: '#64748b', textAlign: 'right' },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10, marginBottom: 14 },
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
  colOs: { width: '10%' },
  colData: { width: '16%' },
  colCliente: { width: '24%' },
  colServico: { width: '30%' },
  colValor: { width: '20%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValor: { fontSize: 13, fontWeight: 700, color: '#0a4f4d' },
  rodape: { position: 'absolute', bottom: 24, left: 32, right: 32, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

interface RelatorioFechamentoPdfDocumentProps {
  entidade: Entidade
  ordens: OrdemServicoComRelacoes[]
  periodoLabel: string
  empresa: EmpresaConfig | undefined
}

function formatarData(data: string | null) {
  return data ? format(parseISO(data), 'dd/MM/yyyy') : '—'
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function RelatorioFechamentoPdfDocument({
  entidade,
  ordens,
  periodoLabel,
  empresa,
}: RelatorioFechamentoPdfDocumentProps) {
  const total = ordens.reduce((acc, o) => acc + valorTotalOrdem(o), 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.empresaBloco}>
            {empresa?.mostrar_logo && empresa.logo_url && (
              <Image style={styles.logo} src={empresa.logo_url} />
            )}
            <View>
              <Text style={styles.empresaNome}>{empresa?.nome_fantasia ?? 'GRS Lab'}</Text>
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
            <Text style={styles.tituloDireita}>Relatório de Fechamento</Text>
            <Text style={styles.subtituloDireita}>{periodoLabel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.infoLabel}>{entidade.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}</Text>
          <Text style={styles.infoValor}>{entidade.nome}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colOs]}>Nº OS</Text>
            <Text style={[styles.th, styles.colData]}>Data</Text>
            <Text style={[styles.th, styles.colCliente]}>Cliente final / Paciente</Text>
            <Text style={[styles.th, styles.colServico]}>Serviços</Text>
            <Text style={[styles.th, styles.colValor]}>{entidade.tipo === 'parceiro' ? 'Comissão' : 'Valor'}</Text>
          </View>
          {ordens.map((ordem) => (
            <View key={ordem.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.colOs]}>#{ordem.numero_os}</Text>
              <Text style={[styles.td, styles.colData]}>{formatarData(ordem.data_entrega ?? ordem.data_recebimento)}</Text>
              <Text style={[styles.td, styles.colCliente]}>
                {[ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ') || '—'}
              </Text>
              <Text style={[styles.td, styles.colServico]}>
                {ordem.itens.map((i) => i.servico.nome).join(', ')}
              </Text>
              <Text style={[styles.td, styles.colValor]}>{formatarMoeda(valorTotalOrdem(ordem))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total do período:</Text>
          <Text style={styles.totalValor}>{formatarMoeda(total)}</Text>
        </View>

        <Text style={styles.rodape}>
          Documento gerado pelo NexLab em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — sem
          valor fiscal.
        </Text>
      </Page>
    </Document>
  )
}

/** Gera o relatório de fechamento em memória e baixa como arquivo (sempre download, não abre em nova aba). */
export async function baixarRelatorioFechamento(
  entidade: Entidade,
  ordens: OrdemServicoComRelacoes[],
  periodoLabel: string,
  empresa: EmpresaConfig | undefined,
) {
  const blob = await pdf(
    <RelatorioFechamentoPdfDocument entidade={entidade} ordens={ordens} periodoLabel={periodoLabel} empresa={empresa} />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Fechamento-${entidade.nome.replace(/\s+/g, '-')}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
