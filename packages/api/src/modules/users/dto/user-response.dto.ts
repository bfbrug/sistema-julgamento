import { Expose } from 'class-transformer'
import { UserRole } from '@prisma/client'

export class UserResponseDto {
  @Expose() id!: string
  @Expose() email!: string
  @Expose() name!: string
  @Expose() role!: UserRole
  @Expose() isActive!: boolean
  @Expose() createdAt!: Date
  @Expose() updatedAt!: Date
  @Expose() deletedAt?: Date
}
