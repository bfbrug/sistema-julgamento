import { Expose, Type } from 'class-transformer'

class UserDto {
  @Expose()
  id!: string

  @Expose()
  email!: string

  @Expose()
  name!: string
}

class CategoryDto {
  @Expose()
  id!: string

  @Expose()
  name!: string

  @Expose()
  displayOrder!: number
}

export class JudgeResponseDto {
  @Expose()
  id!: string

  @Expose()
  userId!: string

  @Expose()
  displayName!: string

  @Expose()
  @Type(() => UserDto)
  user!: UserDto

  @Expose()
  @Type(() => CategoryDto)
  categories!: CategoryDto[]
}
