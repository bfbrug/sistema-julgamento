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
} from '@nestjs/common'
import { JudgesService } from './judges.service'
import { AddJudgeDto } from './dto/add-judge.dto'
import { UpdateJudgeDto } from './dto/update-judge.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'

@Roles('GESTOR')
@Controller('events/:eventId/judges')
export class JudgesController {
  constructor(@Inject(JudgesService) private readonly judgesService: JudgesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Param('eventId') eventId: string,
    @Body() dto: AddJudgeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.judgesService.add(eventId, dto, user.sub)
  }

  @Get()
  async list(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.judgesService.list(eventId, user.sub)
  }

  @Get(':id')
  async findOne(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.judgesService.findById(id, eventId, user.sub)
  }

  @Patch(':id')
  async update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJudgeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.judgesService.update(id, eventId, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.judgesService.remove(id, eventId, user.sub)
  }
}
