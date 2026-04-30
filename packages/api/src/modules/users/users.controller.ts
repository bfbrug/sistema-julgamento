import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, Inject } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateMeDto } from './dto/update-me.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ListUsersDto } from './dto/list-users.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '../auth/types/jwt-payload.type'
import { plainToInstance } from 'class-transformer'
import { UserResponseDto } from './dto/user-response.dto'

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Roles('GESTOR')
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    const created = await this.usersService.create(createUserDto, user.sub)
    return plainToInstance(UserResponseDto, created, { excludeExtraneousValues: true })
  }

  @Roles('GESTOR')
  @Get()
  async list(@Query() query: ListUsersDto) {
    const { data, meta } = await this.usersService.list(query)
    return {
      data: data.map(user => plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })),
      meta,
    }
  }

  @Patch('me')
  async updateMe(@Body() updateMeDto: UpdateMeDto, @CurrentUser() user: JwtPayload) {
    const updated = await this.usersService.updateMe(user.sub, updateMeDto)
    return plainToInstance(UserResponseDto, updated, { excludeExtraneousValues: true })
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @CurrentUser() user: JwtPayload) {
    await this.usersService.changePassword(user.sub, changePasswordDto)
  }

  @Roles('GESTOR')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id)
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Roles('GESTOR')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    const updated = await this.usersService.update(id, updateUserDto, user.sub)
    return plainToInstance(UserResponseDto, updated, { excludeExtraneousValues: true })
  }

  @Roles('GESTOR')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.usersService.softDelete(id, user.sub)
  }

  @Roles('GESTOR')
  @Post(':id/restore')
  async restore(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const restored = await this.usersService.restore(id, user.sub)
    return plainToInstance(UserResponseDto, restored, { excludeExtraneousValues: true })
  }
}
