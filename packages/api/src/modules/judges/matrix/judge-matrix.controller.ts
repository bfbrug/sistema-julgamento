import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Inject,
} from '@nestjs/common'
import { JudgeMatrixService } from './judge-matrix.service'
import { UpdateMatrixDto } from '../dto/update-matrix.dto'
import { ValidateMatrixDto } from '../dto/validate-matrix.dto'
import { Roles } from '../../../common/decorators/roles.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { JwtPayload } from '../../auth/types/jwt-payload.type'

@Roles('GESTOR')
@Controller('events/:eventId/judge-matrix')
export class JudgeMatrixController {
  constructor(
    @Inject(JudgeMatrixService) private readonly matrixService: JudgeMatrixService,
  ) {}

  @Get()
  async getMatrix(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.matrixService.getMatrix(eventId, user.sub)
  }

  @Put()
  async updateMatrix(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateMatrixDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.matrixService.updateMatrix(eventId, dto, user.sub)
  }

  @Post('validate')
  async validateMatrix(
    @Param('eventId') eventId: string,
    @Body() dto: ValidateMatrixDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.matrixService.validateMatrix(eventId, dto, user.sub)
  }
}
