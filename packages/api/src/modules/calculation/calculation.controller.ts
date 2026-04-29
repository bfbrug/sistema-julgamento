import { Controller, Get, Param, UseGuards, Request, Inject } from '@nestjs/common'
import { CalculationService } from './calculation.service'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('events/:eventId/calculation')
@UseGuards(RolesGuard)
export class CalculationController {
  constructor(@Inject(CalculationService) private readonly calculationService: CalculationService) {}

  @Get()
  @Roles('GESTOR')
  async getCalculation(
    @Param('eventId') eventId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const managerId = req.user.sub
    return this.calculationService.calculate(eventId, managerId)
  }
}
