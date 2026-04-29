import { JudgeSessionStatus, ParticipantState } from '../enums'

export const WS_EVENTS = {
  PARTICIPANT_ACTIVATED: 'participant_activated',
  PARTICIPANT_FINISHED: 'participant_finished',
  PARTICIPANT_ABSENT: 'participant_absent',
  JUDGE_STARTED: 'judge_started',
  JUDGE_CONFIRMED: 'judge_confirmed',
  JUDGE_REVISING: 'judge_revising',
  JUDGE_FINALIZED: 'judge_finalized',
} as const

export type WsEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS]

export interface ParticipantActivatedPayload {
  eventId: string
  participant: {
    id: string
    name: string
    presentationOrder: number
  }
}

export interface ParticipantFinishedPayload {
  eventId: string
  participantId: string
}

export interface ParticipantAbsentPayload {
  eventId: string
  participantId: string
}

export interface JudgeProgressPayload {
  eventId: string
  participantId: string
  judgeId: string
  judgeDisplayName: string
  status: JudgeSessionStatus
}
