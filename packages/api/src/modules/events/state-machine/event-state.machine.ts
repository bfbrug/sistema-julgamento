import { EventStatus, CalculationRule } from '@prisma/client'

export interface ValidationContext {
  categoryCount: number
  judgeCount: number
  participantCount: number
  pendingParticipantIds: string[]
  categoriesWithFewJudges: string[]
  acknowledgeR2Coverage?: boolean
  calculationRule: CalculationRule
}

export interface TransitionError {
  code: string
  message: string
}

export interface TransitionValidationResult {
  allowed: boolean
  errors: TransitionError[]
}

const ALLOWED_TRANSITIONS: Map<EventStatus, EventStatus[]> = new Map([
  [EventStatus.DRAFT, [EventStatus.REGISTERING]],
  [EventStatus.REGISTERING, [EventStatus.DRAFT, EventStatus.IN_PROGRESS]],
  [EventStatus.IN_PROGRESS, [EventStatus.FINISHED]],
  [EventStatus.FINISHED, []],
])

export class EventStateMachine {
  canTransition(from: EventStatus, to: EventStatus): boolean {
    return ALLOWED_TRANSITIONS.get(from)?.includes(to) ?? false
  }

  async validateTransition(
    from: EventStatus,
    to: EventStatus,
    ctx: ValidationContext,
  ): Promise<TransitionValidationResult> {
    const errors: TransitionError[] = []

    if (!this.canTransition(from, to)) {
      return {
        allowed: false,
        errors: [
          {
            code: 'INVALID_TRANSITION',
            message: `Transição de ${from} para ${to} não é permitida`,
          },
        ],
      }
    }

    if (from === EventStatus.DRAFT && to === EventStatus.REGISTERING) {
      if (ctx.categoryCount < 1) {
        errors.push({
          code: 'NO_CATEGORIES',
          message: 'O evento deve ter ao menos uma categoria para abrir inscrições',
        })
      }
      if (ctx.judgeCount < 1) {
        errors.push({
          code: 'NO_JUDGES',
          message: 'O evento deve ter ao menos um jurado para abrir inscrições',
        })
      }
      if (ctx.participantCount < 1) {
        errors.push({
          code: 'NO_PARTICIPANTS',
          message: 'O evento deve ter ao menos um participante para abrir inscrições',
        })
      }
    }

    if (from === EventStatus.REGISTERING && to === EventStatus.IN_PROGRESS) {
      if (ctx.calculationRule === CalculationRule.R2 && ctx.categoriesWithFewJudges.length > 0) {
        if (!ctx.acknowledgeR2Coverage) {
          errors.push({
            code: 'R2_COVERAGE_WARNING',
            message: `As seguintes categorias possuem menos de 3 jurados (regra R2): ${ctx.categoriesWithFewJudges.join(', ')}`,
          })
        }
      }
    }

    if (from === EventStatus.IN_PROGRESS && to === EventStatus.FINISHED) {
      if (ctx.pendingParticipantIds.length > 0) {
        errors.push({
          code: 'PARTICIPANTS_PENDING',
          message: `Os seguintes participantes ainda não foram finalizados: ${ctx.pendingParticipantIds.join(', ')}`,
        })
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
    }
  }
}
