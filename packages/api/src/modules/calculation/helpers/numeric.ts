import { Prisma } from '@prisma/client'

/**
 * Arredondamento "half to even" (banker's rounding) para evitar viés.
 * @param value Valor a ser arredondado
 * @param decimals Número de casas decimais
 * @returns Valor arredondado
 */
export function roundHalfEven(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals)
  const x = value * multiplier
  const i = Math.floor(x + 1e-14) // adjust for float imprecision
  const f = x - i
  
  if (Math.abs(f - 0.5) < 1e-10) {
    // Se a parte fracionária for exatamente 0.5, arredonda para o par mais próximo
    return (i % 2 === 0 ? i : i + 1) / multiplier
  }
  
  return Math.round(x) / multiplier
}

/**
 * Converte Prisma.Decimal para number com cuidado
 * @param d O valor Decimal do Prisma
 * @returns O valor convertido para number, ou 0 se nulo
 */
export function decimalToNumber(d: Prisma.Decimal | null | undefined): number {
  if (!d) return 0
  return Number(d.toString())
}

/**
 * Soma de array com correção de Kahan (compensa erro de ponto flutuante)
 * @param values Array de números a somar
 * @returns Soma precisa
 */
export function preciseSum(values: number[]): number {
  let sum = 0.0
  let c = 0.0
  for (const value of values) {
    const y = value - c
    const t = sum + y
    c = (t - sum) - y
    sum = t
  }
  return sum
}

/**
 * Média aritmética simples
 * @param values Array de números
 * @returns Média
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return preciseSum(values) / values.length
}
