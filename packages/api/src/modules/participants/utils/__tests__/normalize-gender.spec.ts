import { normalizeGender } from '../normalize-gender';

describe('normalizeGender', () => {
  it.each([
    ['M', 'MALE'],
    ['m', 'MALE'],
    ['Masculino', 'MALE'],
    ['Male', 'MALE'],
  ])('"%s" → %s', (input, expected) => {
    expect(normalizeGender(input)).toBe(expected);
  });

  it.each([
    ['F', 'FEMALE'],
    ['f', 'FEMALE'],
    ['Feminino', 'FEMALE'],
    ['female', 'FEMALE'],
  ])('"%s" → %s', (input, expected) => {
    expect(normalizeGender(input)).toBe(expected);
  });

  it('rejeita valor inválido', () => {
    expect(() => normalizeGender('X')).toThrow('gênero inválido "X"');
  });

  it('rejeita undefined', () => {
    expect(() => normalizeGender(undefined)).toThrow('gênero ausente');
  });

  it('rejeita null', () => {
    expect(() => normalizeGender(null)).toThrow('gênero ausente');
  });

  it('rejeita string vazia', () => {
    expect(() => normalizeGender('')).toThrow('gênero ausente');
  });
});
