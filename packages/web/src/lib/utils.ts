import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEventDate(dateStr: string, style: 'short' | 'long' = 'short'): string {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const d = new Date(year, month - 1, day)
  if (style === 'long') {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('pt-BR')
}
