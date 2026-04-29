import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Judge, JudgeCategory, Prisma } from '@prisma/client'

export type JudgeWithRelations = Judge & {
  user: { id: string; email: string; name: string }
  judgeCategories: Array<{
    id: string
    categoryId: string
    category: { id: string; name: string; displayOrder: number }
  }>
}

@Injectable()
export class JudgesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.JudgeCreateInput): Promise<Judge> {
    return this.prisma.judge.create({ data })
  }

  async createWithCategories(
    judgeData: Prisma.JudgeCreateInput,
    categoryIds: string[],
  ): Promise<JudgeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const judge = await tx.judge.create({ data: judgeData })
      if (categoryIds.length > 0) {
        await tx.judgeCategory.createMany({
          data: categoryIds.map((categoryId) => ({ judgeId: judge.id, categoryId })),
        })
      }
      return tx.judge.findUniqueOrThrow({
        where: { id: judge.id },
        include: {
          user: { select: { id: true, email: true, name: true } },
          judgeCategories: {
            include: { category: { select: { id: true, name: true, displayOrder: true } } },
          },
        },
      })
    })
  }

  async findById(id: string): Promise<JudgeWithRelations | null> {
    return this.prisma.judge.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        judgeCategories: {
          include: { category: { select: { id: true, name: true, displayOrder: true } } },
        },
      },
    })
  }

  async findByEventId(eventId: string): Promise<JudgeWithRelations[]> {
    return this.prisma.judge.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        judgeCategories: {
          include: { category: { select: { id: true, name: true, displayOrder: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findByUserAndEvent(userId: string, eventId: string): Promise<Judge | null> {
    return this.prisma.judge.findUnique({
      where: { userId_eventId: { userId, eventId } },
    })
  }

  async update(id: string, data: Prisma.JudgeUpdateInput): Promise<Judge> {
    return this.prisma.judge.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.judge.delete({ where: { id } })
  }

  async countScores(judgeId: string): Promise<number> {
    return this.prisma.score.count({ where: { judgeId } })
  }

  async countScoresForCell(judgeId: string, categoryId: string): Promise<number> {
    return this.prisma.score.count({ where: { judgeId, categoryId } })
  }

  async findJudgeCategoriesByEventId(eventId: string): Promise<JudgeCategory[]> {
    return this.prisma.judgeCategory.findMany({
      where: { judge: { eventId } },
    })
  }

  async replaceJudgeCategoriesAtomically(
    eventId: string,
    newCells: Array<{ judgeId: string; categoryId: string }>,
    cellsToRemove: Array<{ judgeId: string; categoryId: string }>,
    cellsToAdd: Array<{ judgeId: string; categoryId: string }>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (cellsToRemove.length > 0) {
        await tx.judgeCategory.deleteMany({
          where: {
            OR: cellsToRemove.map(({ judgeId, categoryId }) => ({ judgeId, categoryId })),
          },
        })
      }
      if (cellsToAdd.length > 0) {
        await tx.judgeCategory.createMany({
          data: cellsToAdd,
          skipDuplicates: true,
        })
      }
      void newCells // satisfies unused var lint
    })
  }
}
