import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { ParticipantsService } from './participants.service'
import { CreateParticipantDto } from './dto/create-participant.dto'
import { UpdateParticipantDto } from './dto/update-participant.dto'
import { ReorderParticipantsDto } from './dto/reorder-participants.dto'
import { MarkAbsentDto } from './dto/mark-absent.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'
import { AppException } from '../../common/exceptions/app.exception'
import { env } from '../../config/env'

@Roles('GESTOR')
@Controller('events/:eventId/participants')
export class ParticipantsController {
  constructor(
    @Inject(ParticipantsService) private readonly participantsService: ParticipantsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateParticipantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.create(eventId, dto, user.sub)
  }

  @Get()
  async list(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.participantsService.list(eventId, user.sub)
  }

  @Patch('reorder')
  async reorder(
    @Param('eventId') eventId: string,
    @Body() dto: ReorderParticipantsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.reorder(eventId, dto, user.sub)
  }

  @Get(':id')
  async findOne(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.findById(id, eventId, user.sub)
  }

  @Patch(':id')
  async update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.update(id, eventId, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.remove(id, eventId, user.sub)
  }

  @Post(':id/photo')
  async uploadPhoto(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file()
    if (!data) {
      throw new AppException('Nenhum arquivo enviado', 400, 'NO_FILE')
    }

    const buffer = await data.toBuffer()

    if (buffer.length > env.PARTICIPANT_PHOTO_MAX_BYTES) {
      throw new AppException(
        `Arquivo excede o tamanho máximo de ${env.PARTICIPANT_PHOTO_MAX_BYTES} bytes`,
        422,
        'FILE_TOO_LARGE',
      )
    }

    return this.participantsService.uploadPhoto(
      id,
      eventId,
      {
        buffer,
        originalName: data.filename,
        mimeType: data.mimetype,
      },
      user.sub,
    )
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.OK)
  async removePhoto(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.removePhoto(id, eventId, user.sub)
  }

  @Post(':id/mark-absent')
  async markAbsent(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: MarkAbsentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.markAbsent(id, eventId, dto, user.sub)
  }

  @Post(':id/unmark-absent')
  async unmarkAbsent(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.participantsService.unmarkAbsent(id, eventId, user.sub)
  }
}
