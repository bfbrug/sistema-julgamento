import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { UpdateTiebreakerDto } from './dto/update-tiebreaker.dto'
import { UpdateCertificateTextDto } from './dto/update-certificate-text.dto'
import { TransitionEventDto } from './dto/transition-event.dto'
import { ListEventsDto } from './dto/list-events.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'

@Roles('GESTOR')
@Controller('events')
export class EventsController {
  constructor(@Inject(EventsService) private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    return this.eventsService.create(dto, user.sub)
  }

  @Get()
  async list(@Query() query: ListEventsDto, @CurrentUser() user: JwtPayload) {
    return this.eventsService.list(query, user.sub)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findById(id, user.sub)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.update(id, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.eventsService.softDelete(id, user.sub)
  }

  @Post(':id/transition')
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.transition(id, dto, user.sub)
  }

  @Put(':id/tiebreaker')
  async updateTiebreaker(
    @Param('id') id: string,
    @Body() dto: UpdateTiebreakerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateTiebreaker(id, dto, user.sub)
  }

  @Delete(':id/tiebreaker')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTiebreaker(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.eventsService.removeTiebreaker(id, user.sub)
  }

  @Put(':id/certificate-text')
  async updateCertificateText(
    @Param('id') id: string,
    @Body() dto: UpdateCertificateTextDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateCertificateText(id, dto.text, user.sub)
  }
}
