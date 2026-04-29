import type { Category } from '../domain/category'
import type { JudgingEvent } from '../domain/event'
import type { JudgeWithCategories } from '../domain/judge'
import type { Participant } from '../domain/participant'
import { z } from 'zod'
import {
  createEventSchema,
  updateEventSchema,
  createCategorySchema,
  updateCategorySchema,
  createParticipantSchema,
  updateParticipantSchema,
} from '../schemas'
import type { CreateUserRequest, UpdateUserRequest } from './users'
import type { LoginRequest } from './auth'

// Response type aliases
export type CategoryResponse = Category
export type EventResponse = JudgingEvent
export type JudgeResponse = JudgeWithCategories
export type ParticipantResponse = Participant

// DTO type aliases from schemas
export type CreateEventDto = z.infer<typeof createEventSchema>
export type UpdateEventDto = z.infer<typeof updateEventSchema>
export type CreateCategoryDto = z.infer<typeof createCategorySchema>
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>
export type CreateParticipantDto = z.infer<typeof createParticipantSchema>
export type UpdateParticipantDto = z.infer<typeof updateParticipantSchema>

// Auth/User DTO aliases
export type LoginDto = LoginRequest
export type CreateUserDto = CreateUserRequest
export type UpdateUserDto = UpdateUserRequest

// Judge DTOs (simple shapes, no schema needed)
export interface AddJudgeDto {
  userId: string
}

export interface JudgeCategoryAssignmentDto {
  judgeId: string
  categoryId: string
}
