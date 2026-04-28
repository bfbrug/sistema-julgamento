import { describe, it, expect } from 'vitest'
import { AppException } from '../app.exception'

describe('AppException', () => {
  it('preserva message, statusCode e code', () => {
    const ex = new AppException('Saldo insuficiente', 422, 'INSUFFICIENT_BALANCE')
    expect(ex.message).toBe('Saldo insuficiente')
    expect(ex.getStatus()).toBe(422)
    expect(ex.code).toBe('INSUFFICIENT_BALANCE')
  })

  it('getResponse retorna { message, code }', () => {
    const ex = new AppException('Erro de teste', 400, 'TEST_CODE')
    const response = ex.getResponse() as Record<string, unknown>
    expect(response['message']).toBe('Erro de teste')
    expect(response['code']).toBe('TEST_CODE')
  })

  it('funciona sem code (code é opcional)', () => {
    const ex = new AppException('Não encontrado', 404)
    expect(ex.code).toBeUndefined()
    const response = ex.getResponse() as Record<string, unknown>
    expect(response['code']).toBeUndefined()
  })
})
