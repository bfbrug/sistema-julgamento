import { Test, TestingModule } from '@nestjs/testing'
import { CalculationController } from '../calculation.controller'
import { CalculationService } from '../calculation.service'

describe('CalculationController', () => {
  let controller: CalculationController
  let service: CalculationService

  const mockCalculationService = {
    calculate: vi.fn(),
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
})
