import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { baixarBlob } from '@/lib/download'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  STATUS_OS_LABEL,
  referenciaOrdemExibicao,
  type OrdemServicoComRelacoes,
} from '@/types/domain'
import type { EmpresaConfig } from '@/hooks/useEmpresaConfig'
import { itensDoRelatorio, valorOrdemNoRelatorio } from '../relatorioPersonalizado'

interface FiltrosRelatorioPersonalizado {
  periodo: string
  entidade: string
  servico: string
}

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingHorizontal: 30, paddingBottom: 48, fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  empresaBloco: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 38, height: 38, objectFit: 'contain' },
  empresaNome: { fontSize: 15, fontWeight: 700, color: '#0a4f4d' },
  empresaLinha: { fontSize: 8, color: '#64748b' },
  titulo: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  subtitulo: { marginTop: 2, fontSize: 8, color: '#64748b', textAlign: 'right' },
  filtros: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 9, marginBottom: 12 },
  filtrosTitulo: { fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 5 },
  filtrosRow: { flexDirection: 'row', gap: 14 },
  filtro: { flex: 1 },
  filtroLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' },
  filtroValor: { marginTop: 1, fontSize: 9, fontWeight: 700 },
  resumoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  resumoCard: { flex: 1, borderRadius: 6, backgroundColor: '#f0fdfa', padding: 9 },
  resumoLabel: { fontSize: 8, color: '#0f766e' },
  resumoValor: { marginTop: 2, fontSize: 14, fontWeight: 700, color: '#134e4a' },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 6 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  th: { fontSize: 7, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  td: { fontSize: 8 },
  colOs: { width: '7%' },
  colData: { width: '12%' },
  colEntidade: { width: '19%' },
  colPaciente: { width: '17%' },
  colServicos: { width: '24%' },
  colStatus: { width: '10%' },
  colValor: { width: '11%', textAlign: 'right' },
  totalFinal: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8, marginTop: 10 },
  totalFinalLabel: { fontSize: 9, color: '#64748b' },
  totalFinalValor: { fontSize: 12, fontWeight: 700, color: '#0a4f4d' },
  rodape: { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', color: '#94a3b8', fontSize: 7 },
})

interface RelatorioPersonalizadoPdfDocumentProps {
  ordens: OrdemServicoComRelacoes[]
  filtros: FiltrosRelatorioPersonalizado
  servicoId: string | null
  empresa: EmpresaConfig | undefined
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function RelatorioPersonalizadoPdfDocument({
  ordens,
  filtros,
  servicoId,
  empresa,
}: RelatorioPersonalizadoPdfDocumentProps) {
  const total = ordens.reduce((soma, ordem) => soma + valorOrdemNoRelatorio(ordem, servicoId), 0)

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View style={styles.empresaBloco}>
            {empresa?.mostrar_logo && empresa.logo_url && <Image style={styles.logo} src={empresa.logo_url} />}
            <View>
              <Text style={styles.empresaNome}>{empresa?.nome_fantasia ?? 'NexLab'}</Text>
              {empresa?.mostrar_telefone && empresa.telefone && <Text style={styles.empresaLinha}>{empresa.telefone}</Text>}
              {empresa?.mostrar_email && empresa.email && <Text style={styles.empresaLinha}>{empresa.email}</Text>}
              {empresa?.mostrar_endereco && empresa.endereco && <Text style={styles.empresaLinha}>{empresa.endereco}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.titulo}>Relatório personalizado de OS</Text>
            <Text style={styles.subtitulo}>Extrato de ordens de serviço</Text>
          </View>
        </View>

        <View style={styles.filtros} wrap={false}>
          <Text style={styles.filtrosTitulo}>Filtros aplicados</Text>
          <View style={styles.filtrosRow}>
            <View style={styles.filtro}>
              <Text style={styles.filtroLabel}>Período de recebimento</Text>
              <Text style={styles.filtroValor}>{filtros.periodo}</Text>
            </View>
            <View style={styles.filtro}>
              <Text style={styles.filtroLabel}>Serviço</Text>
              <Text style={styles.filtroValor}>{filtros.servico}</Text>
            </View>
            <View style={styles.filtro}>
              <Text style={styles.filtroLabel}>Cliente / Parceiro</Text>
              <Text style={styles.filtroValor}>{filtros.entidade}</Text>
            </View>
          </View>
        </View>

        <View style={styles.resumoRow} wrap={false}>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoLabel}>Quantidade de OS listadas</Text>
            <Text style={styles.resumoValor}>{ordens.length}</Text>
          </View>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoLabel}>
              {servicoId ? 'Valor total do serviço selecionado' : 'Valor total das OS'}
            </Text>
            <Text style={styles.resumoValor}>{formatarMoeda(total)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.colOs]}>OS / Reg.</Text>
            <Text style={[styles.th, styles.colData]}>Recebimento</Text>
            <Text style={[styles.th, styles.colEntidade]}>Cliente / Parceiro</Text>
            <Text style={[styles.th, styles.colPaciente]}>Final / Paciente</Text>
            <Text style={[styles.th, styles.colServicos]}>Serviços</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
            <Text style={[styles.th, styles.colValor]}>Valor</Text>
          </View>
          {ordens.map((ordem) => (
            <View key={ordem.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colOs]}>#{referenciaOrdemExibicao(ordem).numero}</Text>
              <Text style={[styles.td, styles.colData]}>{format(parseISO(ordem.data_recebimento), 'dd/MM/yyyy')}</Text>
              <Text style={[styles.td, styles.colEntidade]}>{ordem.entidade.nome}</Text>
              <Text style={[styles.td, styles.colPaciente]}>
                {[ordem.cliente_final, ordem.nome_paciente].filter(Boolean).join(' — ') || '—'}
              </Text>
              <Text style={[styles.td, styles.colServicos]}>
                {itensDoRelatorio(ordem, servicoId)
                  .map((item) => `${item.servico.nome}${item.quantidade > 1 ? ` ×${item.quantidade}` : ''}`)
                  .join(', ')}
              </Text>
              <Text style={[styles.td, styles.colStatus]}>{STATUS_OS_LABEL[ordem.status]}</Text>
              <Text style={[styles.td, styles.colValor]}>{formatarMoeda(valorOrdemNoRelatorio(ordem, servicoId))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalFinal} wrap={false}>
          <Text style={styles.totalFinalLabel}>{ordens.length} OS — Total:</Text>
          <Text style={styles.totalFinalValor}>{formatarMoeda(total)}</Text>
        </View>

        <View style={styles.rodape} fixed>
          <Text>Gerado pelo NexLab em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — sem valor fiscal.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function baixarRelatorioPersonalizado(
  ordens: OrdemServicoComRelacoes[],
  filtros: FiltrosRelatorioPersonalizado,
  servicoId: string | null,
  empresa: EmpresaConfig | undefined,
) {
  const blob = await pdf(
    <RelatorioPersonalizadoPdfDocument
      ordens={ordens}
      filtros={filtros}
      servicoId={servicoId}
      empresa={empresa}
    />,
  ).toBlob()
  baixarBlob(blob, `relatorio-os-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`)
}
