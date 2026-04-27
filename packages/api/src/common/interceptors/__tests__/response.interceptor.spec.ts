import { describe, it, expect } from 'vitest'
import { ResponseInterceptor } from '../response.interceptor'
import { ExecutionContext, CallHandler } from '@nestjs/common'
import { of, lastValueFrom } from 'rxjs'

function makeContext(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext
}

function makeHandler(body: unknown): CallHandler {
  return { handle: () => of(body) }
}

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor()

  it('envelopa body simples em { data }', async () => {
    const obs = interceptor.intercept(makeContext(200), makeHandler({ id: 1 }))
    const result = await lastValueFrom(obs)
    expect(result).toEqual({ data: { id: 1 } })
  })

  it('preserva { data, meta } quando body já tem esse formato', async () => {
    const body = { data: [1, 2], meta: { page: 1, total: 2, limit: 10, totalPages: 1 } }
    const obs = interceptor.intercept(makeContext(200), makeHandler(body))
    const result = await lastValueFrom(obs)
    expect(result).toEqual(body)
  })

  it('não envelopa quando status é 204', async () => {
    const obs = interceptor.intercept(makeContext(204), makeHandler(null))
    const result = await lastValueFrom(obs)
    expect(result).toBeNull()
  })

  it('retorna { data: null } quando body é null', async () => {
    const obs = interceptor.intercept(makeContext(200), makeHandler(null))
    const result = await lastValueFrom(obs)
    expect(result).toEqual({ data: null })
  })

  it('retorna { data: null } quando body é undefined', async () => {
    const obs = interceptor.intercept(makeContext(200), makeHandler(undefined))
    const result = await lastValueFrom(obs)
    expect(result).toEqual({ data: null })
  })
})
