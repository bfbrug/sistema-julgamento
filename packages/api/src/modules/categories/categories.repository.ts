import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../config/prisma.service'
import { Category, Prisma } from '@prisma/client'

export type CategoryWithCounts = Category & {
  _count: {
    judgeCategories: number
    scores: number
  }
}

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data })
  }

  async findById(id: string): Promise<CategoryWithCounts | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { judgeCategories: true, scores: true } },
      },
    })
  }

  async findByEventId(eventId: string): Promise<CategoryWithCounts[]> {
    return this.prisma.category.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { judgeCategories: true, scores: true } },
      },
    })
  }

  async findByEventIdAndName(eventId: string, name: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { eventId_name: { eventId, name } },
    })
  }

  async maxDisplayOrder(eventId: string): Promise<number> {
    const result = await this.prisma.category.aggregate({
      where: { eventId },
      _max: { displayOrder: true },
    })
    return result._max.displayOrder ?? 0
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } })
  }

  async countScores(categoryId: string): Promise<number> {
    return this.prisma.score.count({ where: { categoryId } })
  }

  async countTiebreakerRefs(categoryId: string): Promise<number> {
    return this.prisma.tiebreakerConfig.count({
      where: {
        OR: [
          { firstCategoryId: categoryId },
          { secondCategoryId: categoryId },
        ],
      },
    })
  }

  async reorderInTransaction(
    items: Array<{ id: string; displayOrder: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        this.prisma.category.update({ where: { id }, data: { displayOrder } }),
      ),
    )
  }

  async shiftDisplayOrderUp(eventId: string, fromOrder: number): Promise<void> {
    await this.prisma.category.updateMany({
      where: { eventId, displayOrder: { gte: fromOrder } },
      data: { displayOrder: { increment: 1 } },
    })
  }

  async compactDisplayOrder(eventId: string): Promise<void> {
    const categories = await this.prisma.category.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true },
    })
    await this.prisma.$transaction(
      categories.map((cat, index) =>
        this.prisma.category.update({
          where: { id: cat.id },
          data: { displayOrder: index + 1 },
        }),
      ),
    )
  }
}
