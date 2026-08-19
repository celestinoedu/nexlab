import { baixarBlob } from './download'

/**
 * Gera um CSV a partir de linhas (array de arrays) e baixa como arquivo —
 * sempre download, nunca abre em nova aba (mesmo padrão dos PDFs). Separador
 * ";" (não ",") porque o Excel em pt-BR usa vírgula como separador decimal —
 * com ";" os números com vírgula (ex.: "1234,56") abrem certo, célula a
 * célula, sem precisar o usuário configurar nada.
 */
export function baixarCsv(nomeArquivo: string, linhas: (string | number)[][]) {
  const escapar = (valor: string | number) => {
    const original = String(valor ?? '')
    // SEC-005: Excel/LibreOffice podem interpretar texto iniciado por estes
    // caracteres como fórmula, mesmo quando a célula está entre aspas.
    const texto = typeof valor === 'string' && /^\s*[=+\-@]/.test(original) ? `'${original}` : original
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const conteudo = linhas.map((linha) => linha.map(escapar).join(';')).join('\r\n')
  // BOM UTF-8 no início — sem isso o Excel abre acentos quebrados.
  const bom = String.fromCharCode(0xfeff)
  const blob = new Blob([bom + conteudo], { type: 'text/csv;charset=utf-8;' })
  baixarBlob(blob, nomeArquivo)
}

/** Formata um número no padrão pt-BR (vírgula decimal), sem símbolo de moeda — pra ficar numérico no CSV. */
export function formatarNumeroCsv(valor: number) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
