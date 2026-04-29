import { describe, it, expect } from 'vitest'
import { CalculationRule, EventStatus } from '@prisma/client'
import { validateMatrix } from '../judge-matrix.validator'

const makeEvent = (overrides: {
  calculationRule?: CalculationRule
  status?: EventStatus
} = {}) => ({
  calculationRule: overrides.calculationRule ?? CalculationRule.R1,
  status: overrides.status ?? EventStatus.DRAFT,
})

const judges = [
  { id: 'j1', displayName: 'Jurado 1' },
  { id: 'j2', displayName: 'Jurado 2' },
  { id: 'j3', displayName: 'Jurado 3' },
  { id: 'j4', displayName: 'Jurado 4' },
]

const categories = [
  { id: 'c1', name: 'Técnica Vocal' },
  { id: 'c2', name: 'Coreografia' },
  { id: 'c3', name: 'Figurino' },
  { id: 'c4', name: 'Expressão' },
]

describe('validateMatrix — função pura', () => {
  describe('RN-09.5 — Sem categorias', () => {
    it('evento sem categorias → ERROR NO_CATEGORIES_IN_EVENT', () => {
      const report = validateMatrix(makeEvent(), judges, [], [])
      expect(report.isValid).toBe(false)
      expect(report.errors.some((e) => e.code === 'NO_CATEGORIES_IN_EVENT')).toBe(true)
    })
  })

  describe('RN-09.4 — Sem jurados', () => {
    it('evento sem jurados → ERROR NO_JUDGES_IN_EVENT', () => {
      const report = validateMatrix(makeEvent(), [], categories, [])
      expect(report.isValid).toBe(false)
      expect(report.errors.some((e) => e.code === 'NO_JUDGES_IN_EVENT')).toBe(true)
    })
  })

  describe('RN-09.1 — Categoria sem jurado', () => {
    it('categoria sem jurado → ERROR CATEGORY_WITHOUT_JUDGE com lista', () => {
      const cells = [
        { judgeId: 'j1', categoryId: 'c1' },
        { judgeId: 'j2', categoryId: 'c1' },
        { judgeId: 'j3', categoryId: 'c1' },
        // c2, c3, c4 sem jurado
      ]
      const report = validateMatrix(makeEvent(), judges, categories, cells)
      const err = report.errors.find((e) => e.code === 'CATEGORY_WITHOUT_JUDGE')
      expect(err).toBeDefined()
      const details = err!.details as { categories: { id: string }[] }
      const ids = details.categories.map((c) => c.id)
      expect(ids).toContain('c2')
      expect(ids).toContain('c3')
      expect(ids).toContain('c4')
      expect(ids).not.toContain('c1')
    })
  })

  describe('RN-09.2 — Jurado sem categoria', () => {
    it('jurado sem categoria → ERROR JUDGE_WITHOUT_CATEGORY com lista', () => {
      const cells = [
        { judgeId: 'j1', categoryId: 'c1' },
        { judgeId: 'j1', categoryId: 'c2' },
        { judgeId: 'j1', categoryId: 'c3' },
        { judgeId: 'j1', categoryId: 'c4' },
        // j2, j3, j4 sem categoria
      ]
      const report = validateMatrix(makeEvent(), judges, categories, cells)
      const err = report.errors.find((e) => e.code === 'JUDGE_WITHOUT_CATEGORY')
      expect(err).toBeDefined()
      const details = err!.details as { judges: { id: string }[] }
      const ids = details.judges.map((j) => j.id)
      expect(ids).toContain('j2')
      expect(ids).toContain('j3')
      expect(ids).toContain('j4')
      expect(ids).not.toContain('j1')
    })
  })

  describe('RN-09.3 — Cobertura R2', () => {
    it('R2 com categoria de 1 jurado → WARNING R2_INSUFFICIENT_COVERAGE', () => {
      const cells = [
        { judgeId: 'j1', categoryId: 'c1' }, // 1 jurado
        { judgeId: 'j2', categoryId: 'c1' },
        { judgeId: 'j3', categoryId: 'c1' },
        { judgeId: 'j4', categoryId: 'c1' },
        { judgeId: 'j1', categoryId: 'c2' }, // 1 jurado em c2
        { judgeId: 'j2', categoryId: 'c3' }, // 1 jurado em c3
        { judgeId: 'j3', categoryId: 'c4' }, // 1 jurado em c4
      ]
      const event = makeEvent({ calculationRule: CalculationRule.R2 })
      // Apenas j4 não tem categorias, mas c2/c3/c4 têm 1 jurado cada
      const judgesUsed = [{ id: 'j1', displayName: 'J1' }, { id: 'j2', displayName: 'J2' }, { id: 'j3', displayName: 'J3' }, { id: 'j4', displayName: 'J4' }]
      const report = validateMatrix(event, judgesUsed, categories, cells)
      const warn = report.warnings.find((w) => w.code === 'R2_INSUFFICIENT_COVERAGE')
      expect(warn).toBeDefined()
    })

    it('R2 com categoria de 2 jurados → WARNING R2_INSUFFICIENT_COVERAGE', () => {
      const simpleJudges = [
        { id: 'j1', displayName: 'J1' },
        { id: 'j2', displayName: 'J2' },
        { id: 'j3', displayName: 'J3' },
      ]
      const simpleCats = [{ id: 'c1', name: 'C1' }]
      const cells = [
        { judgeId: 'j1', categoryId: 'c1' },
        { judgeId: 'j2', categoryId: 'c1' },
        // só 2 jurados — insuficiente para R2
      ]
      // j3 sem categoria vai gerar JUDGE_WITHOUT_CATEGORY (erro), mas também deve haver warning R2
      const event = makeEvent({ calculationRule: CalculationRule.R2 })
      const report = validateMatrix(event, simpleJudges, simpleCats, cells)
      const warn = report.warnings.find((w) => w.code === 'R2_INSUFFICIENT_COVERAGE')
      expect(warn).toBeDefined()
    })

    it('R2 com categoria de 3 jurados → sem warning R2_INSUFFICIENT_COVERAGE', () => {
      const simpleJudges = [
        { id: 'j1', displayName: 'J1' },
        { id: 'j2', displayName: 'J2' },
        { id: 'j3', displayName: 'J3' },
      ]
      const simpleCats = [{ id: 'c1', name: 'C1' }]
      const cells = [
        { judgeId: 'j1', categoryId: 'c1' },
        { judgeId: 'j2', categoryId: 'c1' },
        { judgeId: 'j3', categoryId: 'c1' },
      ]
      const event = makeEvent({ calculationRule: CalculationRule.R2 })
      const report = validateMatrix(event, simpleJudges, simpleCats, cells)
      expect(report.warnings.find((w) => w.code === 'R2_INSUFFICIENT_COVERAGE')).toBeUndefined()
    })

    it('R1 com categoria de 1 jurado → sem warning (R1 funciona com qualquer N)', () => {
      const simpleJudges = [{ id: 'j1', displayName: 'J1' }]
      const simpleCats = [{ id: 'c1', name: 'C1' }]
      const cells = [{ judgeId: 'j1', categoryId: 'c1' }]
      const event = makeEvent({ calculationRule: CalculationRule.R1 })
      const report = validateMatrix(event, simpleJudges, simpleCats, cells)
      expect(report.warnings.find((w) => w.code === 'R2_INSUFFICIENT_COVERAGE')).toBeUndefined()
    })
  })

  describe('Múltiplos erros simultâneos', () => {
    it('retorna CATEGORY_WITHOUT_JUDGE e JUDGE_WITHOUT_CATEGORY juntos', () => {
      // j1 → c1, j2 sem nada, c2 sem ninguém
      const cells = [{ judgeId: 'j1', categoryId: 'c1' }]
      const twoJudges = [
        { id: 'j1', displayName: 'J1' },
        { id: 'j2', displayName: 'J2' },
      ]
      const twoCats = [
        { id: 'c1', name: 'C1' },
        { id: 'c2', name: 'C2' },
      ]
      const report = validateMatrix(makeEvent(), twoJudges, twoCats, cells)
      const codes = report.errors.map((e) => e.code)
      expect(codes).toContain('CATEGORY_WITHOUT_JUDGE')
      expect(codes).toContain('JUDGE_WITHOUT_CATEGORY')
    })
  })

  describe('Cenário do levantamento', () => {
    it('4 jurados nas 4 categorias + 1 jurado solo na 5ª categoria → warning R2_INSUFFICIENT_COVERAGE para a categoria solo', () => {
      const fiveJudges = [
        { id: 'j1', displayName: 'J1' },
        { id: 'j2', displayName: 'J2' },
        { id: 'j3', displayName: 'J3' },
        { id: 'j4', displayName: 'J4' },
        { id: 'j5', displayName: 'J5 Solo' },
      ]
      const fiveCats = [
        { id: 'c1', name: 'C1' },
        { id: 'c2', name: 'C2' },
        { id: 'c3', name: 'C3' },
        { id: 'c4', name: 'C4' },
        { id: 'c5', name: 'C5 Solo' },
      ]
      const cells = [
        // 4 jurados nas 4 primeiras categorias
        { judgeId: 'j1', categoryId: 'c1' },
        { judgeId: 'j2', categoryId: 'c1' },
        { judgeId: 'j3', categoryId: 'c1' },
        { judgeId: 'j4', categoryId: 'c1' },
        { judgeId: 'j1', categoryId: 'c2' },
        { judgeId: 'j2', categoryId: 'c2' },
        { judgeId: 'j3', categoryId: 'c2' },
        { judgeId: 'j4', categoryId: 'c2' },
        { judgeId: 'j1', categoryId: 'c3' },
        { judgeId: 'j2', categoryId: 'c3' },
        { judgeId: 'j3', categoryId: 'c3' },
        { judgeId: 'j4', categoryId: 'c3' },
        { judgeId: 'j1', categoryId: 'c4' },
        { judgeId: 'j2', categoryId: 'c4' },
        { judgeId: 'j3', categoryId: 'c4' },
        { judgeId: 'j4', categoryId: 'c4' },
        // j5 apenas na c5
        { judgeId: 'j5', categoryId: 'c5' },
      ]

      const event = makeEvent({ calculationRule: CalculationRule.R2 })
      const report = validateMatrix(event, fiveJudges, fiveCats, cells)

      // c5 tem 1 jurado sob R2 → warning
      const warn = report.warnings.find((w) => w.code === 'R2_INSUFFICIENT_COVERAGE')
      expect(warn).toBeDefined()
      const details = warn!.details as { categories: { id: string }[] }
      expect(details.categories.map((c) => c.id)).toContain('c5')
      expect(details.categories.map((c) => c.id)).not.toContain('c1')

      // Sem erros (todos os jurados têm categoria, todas as categorias têm jurado)
      expect(report.errors).toHaveLength(0)
    })
  })

  describe('Cenário válido completo', () => {
    it('evento sem erros e sem warnings → isValid true', () => {
      const simpleJudges = [
        { id: 'j1', displayName: 'J1' },
        { id: 'j2', displayName: 'J2' },
        { id: 'j3', displayName: 'J3' },
      ]
      const simpleCats = [{ id: 'c1', name: 'C1' }]
      const cells = [
        { judgeId: 'j1', categoryId: 'c1' },
        { judgeId: 'j2', categoryId: 'c1' },
        { judgeId: 'j3', categoryId: 'c1' },
      ]
      const event = makeEvent({ calculationRule: CalculationRule.R1 })
      const report = validateMatrix(event, simpleJudges, simpleCats, cells)
      expect(report.isValid).toBe(true)
      expect(report.errors).toHaveLength(0)
      expect(report.warnings).toHaveLength(0)
    })
  })
})
