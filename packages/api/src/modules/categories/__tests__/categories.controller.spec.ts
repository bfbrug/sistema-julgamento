import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { CategoriesController } from '../categories.controller'
import { CategoriesService } from '../categories.service'

const mockCategory = {
  id: 'cat-1',
  eventId: 'event-1',
  name: 'Técnica Vocal',
  displayOrder: 1,
  counts: { judgesAssigned: 0, scoresRecorded: 0 },
}

describe('CategoriesController', () => {
  let controller: CategoriesController
  let service: any

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(mockCategory),
      list: vi.fn().mockResolvedValue([mockCategory]),
      findById: vi.fn().mockResolvedValue(mockCategory),
      update: vi.fn().mockResolvedValue({ ...mockCategory, name: 'Novo Nome' }),
      remove: vi.fn().mockResolvedValue(undefined),
      reorder: vi.fn().mockResolvedValue([mockCategory]),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compile()

    controller = module.get<CategoriesController>(CategoriesController)
  })

  it('create: chama service.create com eventId, dto e managerId', async () => {
    const res = await controller.create('event-1', { name: 'Técnica Vocal' }, { sub: 'manager-1' } as never)
    expect(res.id).toBe('cat-1')
    expect(service.create).toHaveBeenCalledWith('event-1', { name: 'Técnica Vocal' }, 'manager-1')
  })

  it('list: retorna array de categorias', async () => {
    const res = await controller.list('event-1', { sub: 'manager-1' } as never)
    expect(res).toHaveLength(1)
    expect(service.list).toHaveBeenCalledWith('event-1', 'manager-1')
  })

  it('findOne: chama service.findById com id, eventId e managerId', async () => {
    const res = await controller.findOne('event-1', 'cat-1', { sub: 'manager-1' } as never)
    expect(res.id).toBe('cat-1')
    expect(service.findById).toHaveBeenCalledWith('cat-1', 'event-1', 'manager-1')
  })

  it('update: chama service.update e retorna categoria atualizada', async () => {
    const res = await controller.update('event-1', 'cat-1', { name: 'Novo Nome' }, { sub: 'manager-1' } as never)
    expect(res.name).toBe('Novo Nome')
    expect(service.update).toHaveBeenCalledWith('cat-1', 'event-1', { name: 'Novo Nome' }, 'manager-1')
  })

  it('remove: chama service.remove sem retorno', async () => {
    const res = await controller.remove('event-1', 'cat-1', { sub: 'manager-1' } as never)
    expect(res).toBeUndefined()
    expect(service.remove).toHaveBeenCalledWith('cat-1', 'event-1', 'manager-1')
  })

  it('reorder: chama service.reorder e retorna lista reordenada', async () => {
    const dto = { items: [{ id: 'cat-1', displayOrder: 1 }] }
    const res = await controller.reorder('event-1', dto, { sub: 'manager-1' } as never)
    expect(res).toHaveLength(1)
    expect(service.reorder).toHaveBeenCalledWith('event-1', dto, 'manager-1')
  })
})
