export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function formatarCpfCnpj(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 14)

  if (digitos.length <= 11) {
    return digitos
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function digitoValido(digitos: string, tamanhoBase: number, pesos: number[]): boolean {
  const soma = digitos
    .slice(0, tamanhoBase)
    .split('')
    .reduce((total, digito, indice) => total + Number(digito) * pesos[indice], 0)
  const resto = soma % 11
  const verificador = resto < 2 ? 0 : 11 - resto
  return verificador === Number(digitos[tamanhoBase])
}

export function cpfCnpjValido(valor: string): boolean {
  const digitos = somenteDigitos(valor)
  if (![11, 14].includes(digitos.length) || /^(\d)\1+$/.test(digitos)) return false

  if (digitos.length === 11) {
    return (
      digitoValido(digitos, 9, [10, 9, 8, 7, 6, 5, 4, 3, 2]) &&
      digitoValido(digitos, 10, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    )
  }

  return (
    digitoValido(digitos, 12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    digitoValido(digitos, 13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  )
}
