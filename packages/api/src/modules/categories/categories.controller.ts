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
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { ReorderCategoriesDto } from './dto/reorder-categories.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'

@Roles('GESTOR')
@Controller('events/:eventId/categories')
export class CategoriesController {
  constructor(
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.create(eventId, dto, user.sub)
  }

  @Get()
  async list(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.list(eventId, user.sub)
  }

  @Patch('reorder')
  async reorder(
    @Param('eventId') eventId: string,
    @Body() dto: ReorderCategoriesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.reorder(eventId, dto, user.sub)
  }

  @Get(':id')
  async findOne(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.findById(id, eventId, user.sub)
  }

  @Patch(':id')
  async update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.update(id, eventId, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoriesService.remove(id, eventId, user.sub)
  }
}
