import type { CalculationRule, EventStatus, EventGenderMode } from '../enums'
import type { TiebreakerConfig } from './tiebreaker'

export interface JudgingEvent {
  id: string
  name: string
  eventDate: string
  location: string
  organizer: string
  managerId: string
  calculationRule: CalculationRule
  scoreMin: number
  scoreMax: number
  topN: number
  status: EventStatus
  genderMode: EventGenderMode
  certificateText: string | null
  tiebreaker: TiebreakerConfig | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface EventSummary {
  id: string
  name: string
  eventDate: string
  status: EventStatus
}

export interface TransitionEventDto {
  targetStatus: EventStatus
  acknowledgeR2Coverage?: boolean
}
