/**
 * Dispara o download de um Blob e libera a URL temporária depois que o
 * navegador teve tempo de iniciar a transferência. Revogar a URL no mesmo
 * tick do clique pode cancelar o download no Firefox e no Safari.
 */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
