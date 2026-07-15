// Validadores de documentos/campos brasileiros (dígitos verificadores).
// Pure functions — testáveis sem banco (ver __tests__/br-validation.test.ts).

/** Remove tudo que não é dígito. */
export function onlyDigits(v: string): string {
  return (v ?? '').replace(/\D/g, '')
}

/** Valida CPF pelos dígitos verificadores (rejeita sequências repetidas). */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcDigit = (len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10])
}

/** Valida CNPJ pelos dígitos verificadores (rejeita sequências repetidas). */
export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calcDigit = (len: number): number => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i]
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return calcDigit(12) === Number(cnpj[12]) && calcDigit(13) === Number(cnpj[13])
}

/**
 * Valida CPF ou CNPJ conforme o tipo ('pf' → CPF, 'pj' → CNPJ).
 * Se não houver tipo, aceita qualquer um dos dois com tamanho válido.
 */
export function isValidCpfCnpj(value: string, tipo?: 'pf' | 'pj'): boolean {
  const digits = onlyDigits(value)
  if (tipo === 'pf') return isValidCPF(digits)
  if (tipo === 'pj') return isValidCNPJ(digits)
  return isValidCPF(digits) || isValidCNPJ(digits)
}

/** CEP brasileiro: exatamente 8 dígitos. */
export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8
}

/** Telefone brasileiro: 10 (fixo) ou 11 (celular) dígitos, incluindo DDD. */
export function isValidPhoneBR(value: string): boolean {
  const len = onlyDigits(value).length
  return len === 10 || len === 11
}
