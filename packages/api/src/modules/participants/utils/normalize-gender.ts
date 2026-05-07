import { Gender } from '@prisma/client';

const MALE_VALUES = new Set(['m', 'masculino', 'male']);
const FEMALE_VALUES = new Set(['f', 'feminino', 'female']);

export function normalizeGender(raw: string | undefined | null): Gender {
  if (raw == null || String(raw).trim() === '') {
    throw new Error('gênero ausente');
  }
  const v = String(raw).trim().toLowerCase();
  if (MALE_VALUES.has(v)) return 'MALE';
  if (FEMALE_VALUES.has(v)) return 'FEMALE';
  throw new Error(`gênero inválido "${raw}"`);
}
