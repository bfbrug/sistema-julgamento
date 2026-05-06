import { EventStatus } from '@judging/shared'

export const eventStatusLabels: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: 'RASCUNHO',
  [EventStatus.IN_PROGRESS]: 'EM ANDAMENTO',
  [EventStatus.FINISHED]: 'FINALIZADO',
}
