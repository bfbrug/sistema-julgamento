import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { ScoringGateway } from '../scoring.gateway'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../config/prisma.service'
import { io, Socket } from 'socket.io-client'

describe('ScoringGateway', () => {
  let app: INestApplication
  let gateway: ScoringGateway
  let jwtService: JwtService

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1', role: 'GESTOR' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            judge: { findUnique: vi.fn().mockResolvedValue(null) },
            judgingEvent: { findUnique: vi.fn().mockResolvedValue({ managerId: 'user-1' }) },
          },
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
    gateway = app.get<ScoringGateway>(ScoringGateway)
    jwtService = app.get<JwtService>(JwtService)
  })

  afterEach(async () => {
    await app.close()
  })

  it('should be defined', () => {
    expect(gateway).toBeDefined()
  })

  // Nota: Testar conexão real via socket.io-client requer que o servidor esteja ouvindo em uma porta real.
  // No ambiente de teste unitário do NestJS, o gateway é instanciado mas não necessariamente aberto para rede externa.
  // Para testes reais de socket, costuma-se usar integration tests com app.listen().
})
