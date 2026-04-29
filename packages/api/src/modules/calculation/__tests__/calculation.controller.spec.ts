import { Test, TestingModule } from '@nestjs/testing'
import { CalculationController } from '../calculation.controller'
import { CalculationService } from '../calculation.service'
import { BadRequestException } from '@nestjs/common'

describe('CalculationController', () => {
  let controller: CalculationController
  let service: CalculationService

  const mockCalculationService = {
    calculate: vi.fn(),
    getTopN: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalculationController],
      providers: [
        {
          provide: CalculationService,
          useValue: mockCalculationService,
        },
      ],
    }).compile()

    controller = module.get<CalculationController>(CalculationController)
    service = module.get<CalculationService>(CalculationService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getCalculation', () => {
    it('should call CalculationService.calculate with correct params', async () => {
      const eventId = 'event-1'
      const managerId = 'manager-1'
      const req = { user: { sub: managerId } }

      mockCalculationService.calculate.mockResolvedValueOnce({
        data: { rankings: [] },
      })

      const result = await controller.getCalculation(eventId, req)

      expect(service.calculate).toHaveBeenCalledWith(eventId, managerId)
      expect(result).toEqual({ data: { rankings: [] } })
    })
  })

  describe('getTopN', () => {
    it('should call CalculationService.getTopN with correct params', async () => {
      const eventId = 'event-1'
      const managerId = 'manager-1'
      const req = { user: { sub: managerId } }
      const n = '5'

      mockCalculationService.getTopN.mockResolvedValueOnce({
        data: { rankings: [] },
      })

      const result = await controller.getTopN(eventId, n, req)

      expect(service.getTopN).toHaveBeenCalledWith(eventId, managerId, 5)
      expect(result).toEqual({ data: { rankings: [] } })
    })

    it('should throw BadRequestException if n is negative', async () => {
      const eventId = 'event-1'
      const req = { user: { sub: 'manager-1' } }
      const n = '-1'

      await expect(controller.getTopN(eventId, n, req)).rejects.toThrow('Parâmetro "n" deve ser um número positivo')
    })

    it('should throw BadRequestException if n is not a number', async () => {
      const eventId = 'event-1'
      const req = { user: { sub: 'manager-1' } }
      const n = 'abc'

      await expect(controller.getTopN(eventId, n, req)).rejects.toThrow('Parâmetro "n" deve ser um número positivo')
    })
  })
})
