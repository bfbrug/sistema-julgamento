import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Inject,
  ForbiddenException,
} from '@nestjs/common'
import { ScoringService } from './scoring.service'
import { RegisterScoresDto } from './dto/register-scores.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'
import { PrismaService } from '../../config/prisma.service'

@Controller('events/:eventId/scoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScoringController {
  constructor(
    @Inject(ScoringService) private readonly service: ScoringService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  // GESTOR ENDPOINTS

  @Post('activate/:participantId')
  @Roles('GESTOR')
  async activate(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.activateParticipant(eventId, participantId, user.sub)
  }

  @Post('start/:participantId')
  @Roles('GESTOR')
  async start(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.startScoring(eventId, participantId, user.sub)
  }

  @Post('mark-absent/:participantId')
  @Roles('GESTOR')
  async markAbsent(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.markAbsent(eventId, participantId, user.sub)
  }

  @Get('state')
  @Roles('GESTOR')
  async getEventState(@Param('eventId') eventId: string) {
    return this.service.getEventScoringState(eventId)
  }

  // JURADO ENDPOINTS

  @Post('register/:participantId')
  @Roles('JURADO')
  async register(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterScoresDto,
  ) {
    const judgeId = await this.getJudgeId(user.sub, eventId)
    return this.service.registerScores(eventId, participantId, judgeId, dto, user.sub)
  }

  @Post('confirm/:participantId')
  @Roles('JURADO')
  async confirm(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const judgeId = await this.getJudgeId(user.sub, eventId)
    return this.service.confirmScores(eventId, participantId, judgeId, user.sub)
  }

  @Post('revise/:participantId')
  @Roles('JURADO')
  async revise(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const judgeId = await this.getJudgeId(user.sub, eventId)
    return this.service.reviseScores(eventId, participantId, judgeId, user.sub)
  }

  @Post('finalize/:participantId')
  @Roles('JURADO')
  async finalize(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const judgeId = await this.getJudgeId(user.sub, eventId)
    return this.service.finalizeScores(eventId, participantId, judgeId, user.sub)
  }

  @Get('my-state')
  @Roles('JURADO')
  async getMyState(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const judgeId = await this.getJudgeId(user.sub, eventId)
    return this.service.getJudgeState(eventId, judgeId)
  }

  private async getJudgeId(userId: string, eventId: string): Promise<string> {
    const judge = await this.prisma.judge.findUnique({
      where: { userId_eventId: { userId, eventId } },
    })
    if (!judge) {
      throw new ForbiddenException('Usuário não é jurado deste evento')
    }
    return judge.id
  }
}
