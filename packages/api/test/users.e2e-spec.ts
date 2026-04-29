import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestApp } from './setup'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

describe('UsersController (e2e)', () => {
  let app: NestFastifyApplication
  let accessToken: string
  let juradoToken: string
  let gestorId: string
  let juradoId: string

  beforeAll(async () => {
    app = await createTestApp()
    
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()

    const passwordHash = await bcrypt.hash('password123', 10)

    const gestor = await prisma.user.create({
      data: {
        email: 'gestor-users@example.com',
        name: 'Gestor',
        passwordHash,
        role: 'GESTOR',
      },
    })
    gestorId = gestor.id

    const jurado = await prisma.user.create({
      data: {
        email: 'jurado-users@example.com',
        name: 'Jurado',
        passwordHash,
        role: 'JURADO',
      },
    })
    juradoId = jurado.id

    let res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'gestor-users@example.com', password: 'password123' })
    accessToken = res.body.data.accessToken

    res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'jurado-users@example.com', password: 'password123' })
    juradoToken = res.body.data.accessToken
  })

  afterAll(async () => {
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
    await app.close()
  })

  it('POST /api/users como GESTOR -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'new@user.com',
        name: 'New User',
        password: 'password123',
        role: 'JURADO'
      })
      .expect(201)

    expect(res.body.data.email).toBe('new@user.com')
    expect(res.body.data.passwordHash).toBeUndefined()
  })

  it('POST /api/users como JURADO -> 403', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${juradoToken}`)
      .send({ email: 'x@x.com', name: 'X', password: 'p12121212', role: 'JURADO' })
      .expect(403)
  })

  it('POST /api/users sem JWT -> 401', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .send({ email: 'x@x.com', name: 'X', password: 'p12121212', role: 'JURADO' })
      .expect(401)
  })

  it('POST /api/users com email existente -> 409', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'new@user.com',
        name: 'Another',
        password: 'password123',
        role: 'JURADO'
      })
      .expect(409)
  })

  it('GET /api/users retorna lista paginada', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.meta).toBeDefined()
    expect(res.body.data[0].passwordHash).toBeUndefined()
  })

  it('GET /api/users?search=gestor filtra corretamente', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users?search=gestor')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].name).toBe('Gestor')
  })

  it('GET /api/users?role=JURADO filtra por role', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users?role=JURADO')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.data.every((u: any) => u.role === 'JURADO')).toBe(true)
  })

  it('GET /api/users/:id de inexistente -> 404', async () => {
    await request(app.getHttpServer())
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404)
  })

  it('PATCH /api/users/:id como GESTOR -> 200 com user atualizado', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/users/${juradoId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Jurado Atualizado' })
      .expect(200)

    expect(res.body.data.name).toBe('Jurado Atualizado')
  })

  it('DELETE /api/users/:id soft-deleta', async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${juradoId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204)

    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      
    expect(res.body.data.find((u: any) => u.id === juradoId)).toBeUndefined()
  })

  it('POST /api/users/:id/restore restaura', async () => {
    await request(app.getHttpServer())
      .post(`/api/users/${juradoId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201)

    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      
    expect(res.body.data.find((u: any) => u.id === juradoId)).toBeDefined()
  })

  it('PATCH /api/users/me atualiza proprio nome', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${juradoToken}`)
      .send({ name: 'Jurado Me' })
      .expect(200)

    expect(res.body.data.name).toBe('Jurado Me')
  })

  it('POST /api/users/me/change-password com senha correta -> 204', async () => {
    await request(app.getHttpServer())
      .post('/api/users/me/change-password')
      .set('Authorization', `Bearer ${juradoToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword' })
      .expect(204)
  })

  it('POST /api/users/me/change-password com senha errada -> 401', async () => {
    await request(app.getHttpServer())
      .post('/api/users/me/change-password')
      .set('Authorization', `Bearer ${juradoToken}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpassword' })
      .expect(401)
  })
})
