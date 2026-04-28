import type { CalculationRule, EventStatus } from '../enums'

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
  certificateText: string | null
  createdAt: string
  updatedAt: string
}

export interface EventSummary {
  id: string
  name: string
  eventDate: string
  status: EventStatus
}
