import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestApp } from './setup'
import request from 'supertest'
import { PrismaClient, EventStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

describe('PublicEventsController (e2e)', () => {
  let app: NestFastifyApplication
  let eventId: string
  let finishedEventId: string
  let managerId: string

  beforeAll(async () => {
    app = await createTestApp()

    managerId = 'e2e-manager-1'
    const passwordHash = await bcrypt.hash('password123', 10)
    await prisma.user.deleteMany()
    await prisma.judgingEvent.deleteMany()
    await prisma.participant.deleteMany()
    await prisma.judge.deleteMany()
    await prisma.category.deleteMany()
    await prisma.score.deleteMany()
    await prisma.judgeParticipantSession.deleteMany()

    await prisma.user.create({
      data: {
        id: managerId,
        email: 'manager@example.com',
        name: 'Manager',
        passwordHash,
        role: 'GESTOR',
      },
    })

    const event = await prisma.judgingEvent.create({
      data: {
        name: 'Festival de Música',
        eventDate: new Date('2026-12-15'),
        location: 'Auditório Central',
        organizer: 'Associação Cultural',
        calculationRule: 'R1',
        scoreMin: 0,
        scoreMax: 10,
        topN: 3,
        status: EventStatus.IN_PROGRESS,
        managerId,
      },
    })
    eventId = event.id

    const finishedEvent = await prisma.judgingEvent.create({
      data: {
        name: 'Festival Finalizado',
        eventDate: new Date('2026-12-10'),
        location: 'Teatro Municipal',
        organizer: 'Prefeitura',
        calculationRule: 'R1',
        scoreMin: 0,
        scoreMax: 10,
        topN: 2,
        status: EventStatus.FINISHED,
        managerId,
      },
    })
    finishedEventId = finishedEvent.id

    await prisma.participant.createMany({
      data: [
        {
          eventId,
          name: 'Maria Silva',
          presentationOrder: 1,
          currentState: 'SCORING',
          photoPath: '/photos/maria.jpg',
        },
        {
          eventId,
          name: 'João Carlos',
          presentationOrder: 2,
          currentState: 'WAITING',
        },
        {
          eventId,
          name: 'Ana Beatriz',
          presentationOrder: 3,
          currentState: 'WAITING',
        },
        {
          eventId,
          name: 'Pedro Oliveira',
          presentationOrder: 4,
          currentState: 'WAITING',
        },
        {
          eventId,
          name: 'Lucas Almeida',
          presentationOrder: 5,
          currentState: 'FINISHED',
        },
      ],
    })

    await prisma.participant.createMany({
      data: [
        {
          eventId: finishedEventId,
          name: 'Vencedor A',
          presentationOrder: 1,
          currentState: 'FINISHED',
        },
        {
          eventId: finishedEventId,
          name: 'Vencedor B',
          presentationOrder: 2,
          currentState: 'FINISHED',
        },
      ],
    })

    const category = await prisma.category.create({
      data: { eventId, name: 'Criatividade', displayOrder: 1 },
    })

    const judge1 = await prisma.judge.create({
      data: { eventId, userId: 'judge-1', displayName: 'Jurado 1' },
    })
    const judge2 = await prisma.judge.create({
      data: { eventId, userId: 'judge-2', displayName: 'Jurado 2' },
    })

    await prisma.judgeCategory.create({
      data: { judgeId: judge1.id, categoryId: category.id },
    })
    await prisma.judgeCategory.create({
      data: { judgeId: judge2.id, categoryId: category.id },
    })

    const participant = await prisma.participant.findFirst({
      where: { eventId, currentState: 'SCORING' },
    })

    await prisma.judgeParticipantSession.createMany({
      data: [
        { judgeId: judge1.id, participantId: participant!.id, status: 'FINISHED' },
        { judgeId: judge2.id, participantId: participant!.id, status: 'IN_REVIEW' },
      ],
    })

    await prisma.score.createMany({
      data: [
        { judgeId: judge1.id, participantId: participant!.id, categoryId: category.id, value: 9.5, isFinalized: true },
        { judgeId: judge2.id, participantId: participant!.id, categoryId: category.id, value: 8.5, isFinalized: false },
      ],
    })
  })

  afterAll(async () => {
    await prisma.score.deleteMany()
    await prisma.judgeParticipantSession.deleteMany()
    await prisma.judgeCategory.deleteMany()
    await prisma.judge.deleteMany()
    await prisma.category.deleteMany()
    await prisma.participant.deleteMany()
    await prisma.judgingEvent.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
    await app.close()
  })

  describe('GET /api/public/events/:id', () => {
    it('retorna apenas campos seguros sem JWT', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/events/${eventId}`)
        .expect(200)

      expect(res.body).toHaveProperty('id', eventId)
      expect(res.body).toHaveProperty('name', 'Festival de Música')
      expect(res.body).toHaveProperty('status', 'IN_PROGRESS')
      expect(res.body).toHaveProperty('topN', 3)
      expect(res.body).not.toHaveProperty('scoreMin')
      expect(res.body).not.toHaveProperty('scoreMax')
      expect(res.body).not.toHaveProperty('calculationRule')
    })

    it('retorna 404 para evento inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/public/events/non-existent-id')
        .expect(404)
    })
  })

  describe('GET /api/public/events/:id/live-state', () => {
    it('retorna estado correto sem dados sensíveis e sem JWT', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/events/${eventId}/live-state`)
        .expect(200)

      expect(res.body).toHaveProperty('status', 'IN_PROGRESS')
      expect(res.body).toHaveProperty('currentParticipant')
      expect(res.body.currentParticipant).toHaveProperty('name', 'Maria Silva')
      expect(res.body.currentParticipant).toHaveProperty('presentationOrder', 1)
      expect(res.body).toHaveProperty('totalParticipants', 5)
      expect(res.body).toHaveProperty('completedParticipants', 1)
      expect(res.body).toHaveProperty('totalJudges', 2)
      expect(res.body).toHaveProperty('judgesFinishedCurrentParticipant', 1)
      expect(res.body).toHaveProperty('upcomingParticipants')
      expect(res.body.upcomingParticipants).toHaveLength(3)
      expect(res.body).not.toHaveProperty('judgeId')
      expect(res.body).not.toHaveProperty('score')
    })

    it('retorna estrutura mínima para evento DRAFT', async () => {
      const draftEvent = await prisma.judgingEvent.create({
        data: {
          name: 'Draft Event',
          eventDate: new Date(),
          location: 'Local',
          organizer: 'Org',
          calculationRule: 'R1',
          scoreMin: 0,
          scoreMax: 10,
          topN: 10,
          status: EventStatus.DRAFT,
          managerId,
        },
      })

      const res = await request(app.getHttpServer())
        .get(`/api/public/events/${draftEvent.id}/live-state`)
        .expect(200)

      expect(res.body).toHaveProperty('status', 'DRAFT')
      expect(res.body.currentParticipant).toBeNull()

      await prisma.judgingEvent.delete({ where: { id: draftEvent.id } })
    })
  })

  describe('GET /api/public/events/:id/final-results', () => {
    it('retorna 404 se evento não está FINISHED', async () => {
      await request(app.getHttpServer())
        .get(`/api/public/events/${eventId}/final-results`)
        .expect(404)
    })

    it('retorna ranking vazio para evento sem scores', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/events/${finishedEventId}/final-results`)
        .expect(200)

      expect(res.body).toHaveProperty('ranking')
      expect(Array.isArray(res.body.ranking)).toBe(true)
    })

    it('não exige JWT', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/events/${finishedEventId}/final-results`)
        .expect(200)

      expect(res.body).toHaveProperty('ranking')
      expect(res.body).not.toHaveProperty('judgeId')
      expect(res.body).not.toHaveProperty('score')
    })
  })
})
