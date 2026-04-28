import type { ParticipantState } from '../enums'

export interface Participant {
  id: string
  eventId: string
  name: string
  photoPath: string | null
  presentationOrder: number
  isAbsent: boolean
  currentState: ParticipantState
  createdAt: string
  updatedAt: string
}
