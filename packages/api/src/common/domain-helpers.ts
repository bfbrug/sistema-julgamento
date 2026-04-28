import { Decimal } from '@prisma/client/runtime/library';

export function isValidScoreRange(min: number, max: number): boolean {
  if (min >= max) return false;
  
  // Both must fit in Decimal(3, 1) meaning up to 99.9 or something. 
  // Practically, they shouldn't exceed 99.9 or go below -99.9.
  // But let's mainly check if they are valid numbers and have at most one decimal place.
  if (!hasAtMostOneDecimal(min) || !hasAtMostOneDecimal(max)) return false;

  return true;
}

export function isValidScoreValue(value: number, min: number, max: number): boolean {
  if (!hasAtMostOneDecimal(value)) return false;
  return value >= min && value <= max;
}

export function hasAtMostOneDecimal(value: number): boolean {
  return Math.round(value * 10) / 10 === value;
}
