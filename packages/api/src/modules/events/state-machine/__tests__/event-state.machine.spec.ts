import { EventStateMachine, ValidationContext } from '../event-state.machine'
import { EventStatus, CalculationRule } from '@prisma/client'

const baseCtx = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
  categoryCount: 1,
  judgeCount: 1,
  participantCount: 1,
  pendingParticipantIds: [],
  categoriesWithFewJudges: [],
  acknowledgeR2Coverage: undefined,
  calculationRule: CalculationRule.R1,
  ...overrides,
})

describe('EventStateMachine', () => {
  let machine: EventStateMachine

  beforeEach(() => {
    machine = new EventStateMachine()
  })

  describe('canTransition', () => {
    it('DRAFT → REGISTERING: permitido', () => {
      expect(machine.canTransition(EventStatus.DRAFT, EventStatus.REGISTERING)).toBe(true)
    })

    it('DRAFT → IN_PROGRESS: bloqueado (pula etapa)', () => {
      expect(machine.canTransition(EventStatus.DRAFT, EventStatus.IN_PROGRESS)).toBe(false)
    })

    it('DRAFT → FINISHED: bloqueado', () => {
      expect(machine.canTransition(EventStatus.DRAFT, EventStatus.FINISHED)).toBe(false)
    })

    it('REGISTERING → DRAFT: permitido', () => {
      expect(machine.canTransition(EventStatus.REGISTERING, EventStatus.DRAFT)).toBe(true)
    })

    it('REGISTERING → IN_PROGRESS: permitido', () => {
      expect(machine.canTransition(EventStatus.REGISTERING, EventStatus.IN_PROGRESS)).toBe(true)
    })

    it('IN_PROGRESS → FINISHED: permitido', () => {
      expect(machine.canTransition(EventStatus.IN_PROGRESS, EventStatus.FINISHED)).toBe(true)
    })

    it('IN_PROGRESS → DRAFT: bloqueado', () => {
      expect(machine.canTransition(EventStatus.IN_PROGRESS, EventStatus.DRAFT)).toBe(false)
    })

    it('FINISHED → DRAFT: bloqueado', () => {
      expect(machine.canTransition(EventStatus.FINISHED, EventStatus.DRAFT)).toBe(false)
    })

    it('FINISHED → REGISTERING: bloqueado', () => {
      expect(machine.canTransition(EventStatus.FINISHED, EventStatus.REGISTERING)).toBe(false)
    })

    it('FINISHED → IN_PROGRESS: bloqueado', () => {
      expect(machine.canTransition(EventStatus.FINISHED, EventStatus.IN_PROGRESS)).toBe(false)
    })
  })

  describe('validateTransition', () => {
    it('transição inválida retorna erro INVALID_TRANSITION', async () => {
      const result = await machine.validateTransition(
        EventStatus.DRAFT,
        EventStatus.IN_PROGRESS,
        baseCtx(),
      )
      expect(result.allowed).toBe(false)
      expect(result.errors[0]!.code).toBe('INVALID_TRANSITION')
    })

    it('DRAFT → REGISTERING sem categorias retorna erro NO_CATEGORIES', async () => {
      const result = await machine.validateTransition(
        EventStatus.DRAFT,
        EventStatus.REGISTERING,
        baseCtx({ categoryCount: 0 }),
      )
      expect(result.allowed).toBe(false)
      expect(result.errors.some(e => e.code === 'NO_CATEGORIES')).toBe(true)
    })

    it('DRAFT → REGISTERING sem jurados retorna erro NO_JUDGES', async () => {
      const result = await machine.validateTransition(
        EventStatus.DRAFT,
        EventStatus.REGISTERING,
        baseCtx({ judgeCount: 0 }),
      )
      expect(result.allowed).toBe(false)
      expect(result.errors.some(e => e.code === 'NO_JUDGES')).toBe(true)
    })

    it('DRAFT → REGISTERING sem participantes retorna erro NO_PARTICIPANTS', async () => {
      const result = await machine.validateTransition(
        EventStatus.DRAFT,
        EventStatus.REGISTERING,
        baseCtx({ participantCount: 0 }),
      )
      expect(result.allowed).toBe(false)
      expect(result.errors.some(e => e.code === 'NO_PARTICIPANTS')).toBe(true)
    })

    it('DRAFT → REGISTERING com pré-requisitos: permitido', async () => {
      const result = await machine.validateTransition(
        EventStatus.DRAFT,
        EventStatus.REGISTERING,
        baseCtx(),
      )
      expect(result.allowed).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('REGISTERING → IN_PROGRESS com R2 e categoria com < 3 jurados sem ack: erro R2_COVERAGE_WARNING', async () => {
      const result = await machine.validateTransition(
        EventStatus.REGISTERING,
        EventStatus.IN_PROGRESS,
        baseCtx({
          calculationRule: CalculationRule.R2,
          categoriesWithFewJudges: ['cat-1'],
          acknowledgeR2Coverage: undefined,
        }),
      )
      expect(result.allowed).toBe(false)
      expect(result.errors.some(e => e.code === 'R2_COVERAGE_WARNING')).toBe(true)
    })

    it('REGISTERING → IN_PROGRESS com R2 e ack=true: permitido', async () => {
      const result = await machine.validateTransition(
        EventStatus.REGISTERING,
        EventStatus.IN_PROGRESS,
        baseCtx({
          calculationRule: CalculationRule.R2,
          categoriesWithFewJudges: ['cat-1'],
          acknowledgeR2Coverage: true,
        }),
      )
      expect(result.allowed).toBe(true)
    })

    it('REGISTERING → IN_PROGRESS com R1 mesmo com categorias com < 3 jurados: permitido', async () => {
      const result = await machine.validateTransition(
        EventStatus.REGISTERING,
        EventStatus.IN_PROGRESS,
        baseCtx({
          calculationRule: CalculationRule.R1,
          categoriesWithFewJudges: ['cat-1'],
        }),
      )
      expect(result.allowed).toBe(true)
    })

    it('IN_PROGRESS → FINISHED com participante pendente: erro PARTICIPANTS_PENDING', async () => {
      const result = await machine.validateTransition(
        EventStatus.IN_PROGRESS,
        EventStatus.FINISHED,
        baseCtx({ pendingParticipantIds: ['p-1', 'p-2'] }),
      )
      expect(result.allowed).toBe(false)
      expect(result.errors.some(e => e.code === 'PARTICIPANTS_PENDING')).toBe(true)
    })

    it('IN_PROGRESS → FINISHED sem pendentes: permitido', async () => {
      const result = await machine.validateTransition(
        EventStatus.IN_PROGRESS,
        EventStatus.FINISHED,
        baseCtx({ pendingParticipantIds: [] }),
      )
      expect(result.allowed).toBe(true)
    })

    it('REGISTERING → DRAFT: sempre permitido', async () => {
      const result = await machine.validateTransition(
        EventStatus.REGISTERING,
        EventStatus.DRAFT,
        baseCtx(),
      )
      expect(result.allowed).toBe(true)
    })
  })
})
