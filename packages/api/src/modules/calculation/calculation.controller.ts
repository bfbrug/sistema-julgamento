import { Controller, Get, Param, UseGuards, Request, Inject, Query, BadRequestException } from '@nestjs/common'
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

  @Get('top')
  @Roles('GESTOR')
  async getTopN(
    @Param('eventId') eventId: string,
    @Query('n') n: string,
    @Request() req: { user: { sub: string } },
  ) {
    const managerId = req.user.sub
    const topN = parseInt(n, 10)
    if (isNaN(topN) || topN < 0) {
      throw new BadRequestException('Parâmetro "n" deve ser um número positivo')
    }
    return this.calculationService.getTopN(eventId, managerId, topN)
  }
}
