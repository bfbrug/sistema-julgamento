import { mean } from './numeric'

/**
 * Calcula a média aparada descartando os valores extremos
 * @param values Array de números
 * @param trimCount Quantidade de valores a descartar de cada extremo (menor e maior)
 * @returns A média dos valores restantes
 * @throws Error se não houver valores suficientes após o descarte
 */
export function trimmedMean(values: number[], trimCount: number = 1): number {
  if (values.length <= trimCount * 2) {
    throw new Error('Insufficient values for trimmed mean')
  }
  
  const sorted = [...values].sort((a, b) => a - b)
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  
  return mean(trimmed)
}
