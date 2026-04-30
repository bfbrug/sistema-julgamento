import { ParticipantState, JudgeSessionStatus } from '@judging/shared'

/**
 * ParticipantStateMachine — função pura que computa o currentState coletivo
 * do participante a partir das sessões dos jurados.
 */
export function computeParticipantState(
  current: ParticipantState,
  sessions: { status: JudgeSessionStatus }[],
  totalActiveJudges: number,
): ParticipantState {
  // Estados terminais ou iniciais que requerem ação explícita do gestor
  if (current === 'ABSENT' || current === 'WAITING') return current

  const finishedCount = sessions.filter((s) => s.status === 'FINISHED').length
  const inReviewCount = sessions.filter((s) => s.status === 'IN_REVIEW').length
  const inScoringCount = sessions.filter((s) => s.status === 'IN_SCORING').length
  const startedCount = sessions.filter((s) => s.status !== 'NOT_STARTED').length

  // Se todos os jurados finalizaram, o participante está FINISHED
  if (finishedCount === totalActiveJudges && totalActiveJudges > 0) {
    return 'FINISHED'
  }

  // Se algum jurado está em REVIEW, o estado coletivo é REVIEW (a menos que ainda haja SCORING?)
  // Na verdade, se pelo menos um confirmou, já pode ser considerado REVIEW para o gestor acompanhar.
  // Se houver alguém em REVIEW ou SCORING:
  if (inReviewCount > 0 || inScoringCount > 0) {
    // Se houver alguém em REVIEW, o estado é REVIEW. Se não, SCORING.
    return inReviewCount > 0 ? 'REVIEW' : 'SCORING'
  }

  // Se ninguém começou ainda mas o gestor ativou, continua em PREVIEW
  if (startedCount === 0) {
    return 'PREVIEW'
  }

  return 'SCORING'
}
