import { Controller, Get, Param } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { PublicEventsService } from './public-events.service'

@Public()
@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly publicEventsService: PublicEventsService) {}

  @Get(':id')
  async getPublicEvent(@Param('id') id: string) {
    return this.publicEventsService.getPublicEvent(id)
  }

  @Get(':id/live-state')
  async getLiveState(@Param('id') id: string) {
    return this.publicEventsService.getLiveState(id)
  }

  @Get(':id/final-results')
  async getFinalResults(@Param('id') id: string) {
    return this.publicEventsService.getFinalResults(id)
  }
}
