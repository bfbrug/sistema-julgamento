import { BadRequestException, Injectable, Inject } from '@nestjs/common'
import { Gender, CategoryGenderMode, EventStatus } from '@prisma/client'
import { PrismaService } from '../../config/prisma.service'
import { AuditService } from '../audit/audit.service'
import { RankingBuilderService, RankingResult } from '../reports/ranking-builder.service'
import { CreateResultReleaseDto } from './dto/create-result-release.dto'

@Injectable()
export class ResultReleasesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RankingBuilderService) private readonly rankingBuilder: RankingBuilderService,
  ) {}

  async release(eventId: string, userId: string, dto: CreateResultReleaseDto) {
    const event = await this.prisma.judgingEvent.findUniqueOrThrow({ where: { id: eventId } })
    if (event.status !== EventStatus.FINISHED) {
      throw new BadRequestException('Evento precisa estar encerrado para liberar resultados.')
    }

    const category = await this.prisma.category.findUniqueOrThrow({
      where: { id: dto.categoryId },
      select: { eventId: true, genderMode: true },
    })
    if (category.eventId !== eventId) {
      throw new BadRequestException('Categoria não pertence ao evento.')
    }

    const expectedGender = this.resolveGender(category.genderMode as CategoryGenderMode, dto.gender ?? null)

    const ranking = await this.rankingBuilder.computeRanking(eventId, dto.categoryId, event.managerId)
    const entries = this.entriesFor(ranking, expectedGender)
    const match = entries.find((e) => e.position === dto.position)
    if (!match) {
      throw new BadRequestException(`Posição ${dto.position} não disponível no ranking.`)
    }

    const created = await this.prisma.resultRelease.create({
      data: {
        eventId,
        categoryId: dto.categoryId,
        gender: expectedGender,
        position: dto.position,
        releasedById: userId,
      },
    })

    await this.audit.record({
      actorId: userId,
      actorType: 'USER',
      action: 'RESULT_RELEASED',
      entityType: 'Category',
      entityId: dto.categoryId,
      payload: { gender: expectedGender, position: dto.position, participantId: match.participantId },
    })

    return created
  }

  async revert(eventId: string, userId: string, releaseId: string) {
    const release = await this.prisma.resultRelease.findUniqueOrThrow({ where: { id: releaseId } })
    if (release.eventId !== eventId) {
      throw new BadRequestException('Release não pertence ao evento.')
    }
    await this.prisma.resultRelease.delete({ where: { id: releaseId } })
    await this.audit.record({
      actorId: userId,
      actorType: 'USER',
      action: 'RESULT_UNRELEASED',
      entityType: 'Category',
      entityId: release.categoryId,
      payload: { gender: release.gender, position: release.position },
    })
    return { id: releaseId }
  }

  async getFullRanking(eventId: string) {
    const event = await this.prisma.judgingEvent.findUniqueOrThrow({
      where: { id: eventId },
      select: { managerId: true, categories: { select: { id: true, name: true, genderMode: true } } },
    })
    const categories = await Promise.all(
      event.categories.map(async (cat) => {
        const ranking = await this.rankingBuilder.computeRanking(eventId, cat.id, event.managerId)
        return { id: cat.id, name: cat.name, genderMode: cat.genderMode, ranking }
      }),
    )
    return { categories }
  }

  async list(eventId: string) {
    return this.prisma.resultRelease.findMany({
      where: { eventId },
      orderBy: [{ categoryId: 'asc' }, { gender: 'asc' }, { position: 'asc' }],
    })
  }

  private resolveGender(mode: CategoryGenderMode, provided: Gender | null): Gender | null {
    switch (mode) {
      case 'MIXED':
        if (provided != null) throw new BadRequestException('Categoria mista não aceita gênero.')
        return null
      case 'MALE_ONLY':
        if (provided !== Gender.MALE) throw new BadRequestException('Categoria exclusiva masculina exige gender=MALE.')
        return Gender.MALE
      case 'FEMALE_ONLY':
        if (provided !== Gender.FEMALE)
          throw new BadRequestException('Categoria exclusiva feminina exige gender=FEMALE.')
        return Gender.FEMALE
      case 'UNISEX_SPLIT':
        if (provided !== Gender.MALE && provided !== Gender.FEMALE) {
          throw new BadRequestException('Categoria unissex split exige gender MALE ou FEMALE.')
        }
        return provided
    }
  }

  private entriesFor(ranking: RankingResult, gender: Gender | null) {
    if (ranking.mode === 'UNISEX_SPLIT') {
      return gender === Gender.MALE ? ranking.male : ranking.female
    }
    return ranking.entries
  }
}
