import type { ParticipantResponseDto } from './participant-response.dto'

export interface BulkCreateResult {
  created: number
  skipped: number
  participants: ParticipantResponseDto[]
}
