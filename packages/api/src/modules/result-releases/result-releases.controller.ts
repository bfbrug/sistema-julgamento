import { Body, Controller, Delete, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ResultReleasesService } from './result-releases.service'
import { ResultReleasesGateway } from './result-releases.gateway'
import { CreateResultReleaseDto } from './dto/create-result-release.dto'

@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/results/releases')
export class ResultReleasesController {
  constructor(
    @Inject(ResultReleasesService) private readonly service: ResultReleasesService,
    @Inject(ResultReleasesGateway) private readonly gateway: ResultReleasesGateway,
  ) {}

  @Get()
  list(@Param('eventId') eventId: string) {
    return this.service.list(eventId)
  }

  @Post()
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateResultReleaseDto,
    @Req() req: { user: { id: string } },
  ) {
    const release = await this.service.release(eventId, req.user.id, dto)
    this.gateway.emitReleased(eventId, release)
    return release
  }

  @Delete(':releaseId')
  async remove(
    @Param('eventId') eventId: string,
    @Param('releaseId') releaseId: string,
    @Req() req: { user: { id: string } },
  ) {
    const result = await this.service.revert(eventId, req.user.id, releaseId)
    this.gateway.emitUnreleased(eventId, releaseId)
    return result
  }
}
