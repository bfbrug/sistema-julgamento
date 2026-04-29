import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { EventStatus } from '@prisma/client'
import { JudgesRepository } from '../judges.repository'
import { EventsRepository } from '../../events/events.repository'
import { CategoriesRepository } from '../../categories/categories.repository'
import { AuditService } from '../../audit/audit.service'
import { AppException } from '../../../common/exceptions/app.exception'
import { UpdateMatrixDto } from '../dto/update-matrix.dto'
import { ValidateMatrixDto } from '../dto/validate-matrix.dto'
import { MatrixResponseDto, MatrixValidationReport } from '../dto/matrix-response.dto'
import { validateMatrix } from './judge-matrix.validator'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class JudgeMatrixService {
  constructor(
    @Inject(JudgesRepository) private readonly judgesRepository: JudgesRepository,
    @Inject(EventsRepository) private readonly eventsRepository: EventsRepository,
    @Inject(CategoriesRepository) private readonly categoriesRepository: CategoriesRepository,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  private async getEventOrThrow(eventId: string, managerId: string) {
    const event = await this.eventsRepository.findById(eventId, managerId)
    if (!event) throw new NotFoundException('Evento não encontrado')
    return event
  }

  private assertMatrixEditable(status: EventStatus): void {
    if (status === EventStatus.FINISHED) {
      throw new AppException('Evento finalizado não pode ser alterado', 400, 'EVENT_FINISHED')
    }
    if (status === EventStatus.IN_PROGRESS) {
      throw new AppException(
        'Evento em andamento não permite alterações na matriz de jurados',
        400,
        'EVENT_IN_PROGRESS_LOCK',
      )
    }
  }

  async getMatrix(eventId: string, managerId: string): Promise<MatrixResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)

    const [judges, categories, cells] = await Promise.all([
      this.judgesRepository.findByEventId(eventId),
      this.categoriesRepository.findByEventId(eventId),
      this.judgesRepository.findJudgeCategoriesByEventId(eventId),
    ])

    const activeCells = cells.map((c) => ({ judgeId: c.judgeId, categoryId: c.categoryId }))

    // Calcular totais
    const byCategoryId: Record<string, number> = {}
    const byJudgeId: Record<string, number> = {}

    for (const category of categories) {
      byCategoryId[category.id] = 0
    }
    for (const judge of judges) {
      byJudgeId[judge.id] = 0
    }
    for (const cell of activeCells) {
      if (byCategoryId[cell.categoryId] !== undefined) {
        byCategoryId[cell.categoryId]!++
      }
      if (byJudgeId[cell.judgeId] !== undefined) {
        byJudgeId[cell.judgeId]!++
      }
    }

    const validationReport = validateMatrix(
      { calculationRule: event.calculationRule, status: event.status },
      judges.map((j) => ({ id: j.id, displayName: j.displayName })),
      categories.map((c) => ({ id: c.id, name: c.name })),
      activeCells,
    )

    const raw = {
      event: {
        id: event.id,
        name: event.name,
        calculationRule: event.calculationRule,
      },
      judges: judges.map((j) => ({
        id: j.id,
        displayName: j.displayName,
        user: j.user,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        displayOrder: c.displayOrder,
      })),
      cells: activeCells,
      totals: { byCategoryId, byJudgeId },
      validation: validationReport,
    }

    return plainToInstance(MatrixResponseDto, raw, { excludeExtraneousValues: true })
  }

  async updateMatrix(
    eventId: string,
    dto: UpdateMatrixDto,
    managerId: string,
  ): Promise<MatrixResponseDto> {
    const event = await this.getEventOrThrow(eventId, managerId)
    this.assertMatrixEditable(event.status)

    // Validar pertencimento ao evento
    const judges = await this.judgesRepository.findByEventId(eventId)
    const categories = await this.categoriesRepository.findByEventId(eventId)

    const judgeIds = new Set(judges.map((j) => j.id))
    const categoryIds = new Set(categories.map((c) => c.id))

    for (const cell of dto.cells) {
      if (!judgeIds.has(cell.judgeId)) {
        throw new AppException(
          `Jurado ${cell.judgeId} não pertence a este evento`,
          400,
          'JUDGE_NOT_IN_EVENT',
        )
      }
      if (!categoryIds.has(cell.categoryId)) {
        throw new AppException(
          `Categoria ${cell.categoryId} não pertence a este evento`,
          400,
          'CATEGORY_NOT_IN_EVENT',
        )
      }
    }

    // Checar duplicatas no payload
    const cellKeys = dto.cells.map((c) => `${c.judgeId}:${c.categoryId}`)
    const uniqueCellKeys = new Set(cellKeys)
    if (uniqueCellKeys.size !== cellKeys.length) {
      throw new AppException('Payload contém pares duplicados', 400, 'DUPLICATE_MATRIX_CELLS')
    }

    // Carregar células atuais
    const currentCells = await this.judgesRepository.findJudgeCategoriesByEventId(eventId)
    const currentCellMap = new Map(
      currentCells.map((c) => [`${c.judgeId}:${c.categoryId}`, c]),
    )
    const newCellKeys = new Set(dto.cells.map((c) => `${c.judgeId}:${c.categoryId}`))

    // Calcular diff
    const cellsToRemove = currentCells.filter((c) => !newCellKeys.has(`${c.judgeId}:${c.categoryId}`))
    const cellsToAdd = dto.cells.filter((c) => !currentCellMap.has(`${c.judgeId}:${c.categoryId}`))

    // RN-09.8 — Bloquear remoção de cell com scores
    for (const cell of cellsToRemove) {
      const scoreCount = await this.judgesRepository.countScoresForCell(
        cell.judgeId,
        cell.categoryId,
      )
      if (scoreCount > 0) {
        const judge = judges.find((j) => j.id === cell.judgeId)
        const category = categories.find((c) => c.id === cell.categoryId)
        throw new AppException(
          `O jurado "${judge?.displayName}" já registrou notas na categoria "${category?.name}". Remoção bloqueada.`,
          422,
          'CELL_HAS_SCORES',
        )
      }
    }

    // Persistir atomicamente
    await this.judgesRepository.replaceJudgeCategoriesAtomically(
      eventId,
      dto.cells,
      cellsToRemove.map((c) => ({ judgeId: c.judgeId, categoryId: c.categoryId })),
      cellsToAdd,
    )

    await this.auditService.record({
      action: 'JUDGE_MATRIX_UPDATED',
      entityType: 'JudgeMatrix',
      entityId: eventId,
      actorId: managerId,
      payload: {
        added: cellsToAdd,
        removed: cellsToRemove.map((c) => ({ judgeId: c.judgeId, categoryId: c.categoryId })),
      },
    })

    return this.getMatrix(eventId, managerId)
  }

  async validateMatrix(
    eventId: string,
    dto: ValidateMatrixDto,
    managerId: string,
  ): Promise<MatrixValidationReport> {
    const event = await this.getEventOrThrow(eventId, managerId)

    const [judges, categories] = await Promise.all([
      this.judgesRepository.findByEventId(eventId),
      this.categoriesRepository.findByEventId(eventId),
    ])

    const report = validateMatrix(
      { calculationRule: event.calculationRule, status: event.status },
      judges.map((j) => ({ id: j.id, displayName: j.displayName })),
      categories.map((c) => ({ id: c.id, name: c.name })),
      dto.cells,
    )

    return report
  }
}
