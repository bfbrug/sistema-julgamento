import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../config/prisma.service'

@WebSocketGateway({
  namespace: '/scoring',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class ScoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(ScoringGateway.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client)
      if (!token) {
        this.logger.error('No token provided in handshake')
        client.disconnect(true)
        return
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      })
      
      const eventId = client.handshake.query.eventId as string
      if (!eventId) {
        this.logger.error('No eventId provided in handshake')
        client.disconnect(true)
        return
      }

      // Validação extra: o usuário tem acesso a este evento?
      const judge = await this.prisma.judge.findUnique({
        where: { userId_eventId: { userId: payload.sub, eventId } },
      })
      const event = await this.prisma.judgingEvent.findUnique({
        where: { id: eventId },
        select: { managerId: true },
      })

      if (!judge && event?.managerId !== payload.sub) {
        this.logger.error(`User ${payload.sub} has no access to event ${eventId}`)
        client.disconnect(true)
        return
      }

      ;(client as Socket & { user?: unknown }).user = payload
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub}) to event: ${eventId}`)
      void client.join(`event:${eventId}`)
    } catch (err) {
      this.logger.error('WebSocket connection authentication failed', err)
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  emitToEvent(eventId: string, event: string, payload: unknown) {
    if (this.server) {
      this.server.to(`event:${eventId}`).emit(event, payload)
    }
  }

  private extractToken(client: Socket): string | undefined {
    return client.handshake.auth?.token || client.handshake.query?.token
  }
}
