import { describe, it, expect } from 'vitest'
import { computeParticipantState } from '../participant-state.machine'
import { JudgeSessionStatus } from '@judging/shared'

describe('ParticipantStateMachine', () => {
  it('should keep WAITING state regardless of sessions', () => {
    const state = computeParticipantState(
      'WAITING',
      [{ status: 'IN_SCORING' }],
      1
    )
    expect(state).toBe('WAITING')
  })

  it('should keep ABSENT state regardless of sessions', () => {
    const state = computeParticipantState(
      'ABSENT',
      [{ status: 'FINISHED' }],
      1
    )
    expect(state).toBe('ABSENT')
  })

  it('should return PREVIEW if no judge has started yet', () => {
    const state = computeParticipantState(
      'PREVIEW',
      [
        { status: 'NOT_STARTED' },
        { status: 'NOT_STARTED' }
      ],
      2
    )
    expect(state).toBe('PREVIEW')
  })

  it('should return SCORING if at least one judge is IN_SCORING', () => {
    const state = computeParticipantState(
      'PREVIEW',
      [
        { status: 'IN_SCORING' },
        { status: 'NOT_STARTED' }
      ],
      2
    )
    expect(state).toBe('SCORING')
  })

  it('should return REVIEW if at least one judge is IN_REVIEW', () => {
    const state = computeParticipantState(
      'SCORING',
      [
        { status: 'IN_REVIEW' },
        { status: 'IN_SCORING' }
      ],
      2
    )
    expect(state).toBe('REVIEW')
  })

  it('should return FINISHED only when all active judges are FINISHED', () => {
    const sessions: { status: JudgeSessionStatus }[] = [
      { status: 'FINISHED' },
      { status: 'FINISHED' }
    ]
    
    expect(computeParticipantState('REVIEW', sessions, 2)).toBe('FINISHED')
    
    sessions[1]!.status = 'IN_REVIEW'
    expect(computeParticipantState('REVIEW', sessions, 2)).toBe('REVIEW')
  })

  it('should return PREVIEW if startedCount is 0 even if current is SCORING (manual recovery)', () => {
    const state = computeParticipantState(
      'SCORING',
      [{ status: 'NOT_STARTED' }],
      1
    )
    expect(state).toBe('PREVIEW')
  })
})
