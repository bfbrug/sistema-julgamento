export const UserRole = {
  GESTOR: 'GESTOR',
  JURADO: 'JURADO',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const EventStatus = {
  DRAFT: 'DRAFT',
  REGISTERING: 'REGISTERING',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
} as const
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus]

export const CalculationRule = {
  R1: 'R1',
  R2: 'R2',
} as const
export type CalculationRule = (typeof CalculationRule)[keyof typeof CalculationRule]

export const ParticipantState = {
  WAITING: 'WAITING',
  PREVIEW: 'PREVIEW',
  SCORING: 'SCORING',
  REVIEW: 'REVIEW',
  FINISHED: 'FINISHED',
  ABSENT: 'ABSENT',
} as const
export type ParticipantState = (typeof ParticipantState)[keyof typeof ParticipantState]
