import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({
  namespace: '/public-live',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class ResultReleasesGateway {
  @WebSocketServer()
  server!: Server

  emitReleased(eventId: string, release: unknown) {
    this.server?.to(`public:event:${eventId}`).emit('result:released', release)
  }

  emitUnreleased(eventId: string, releaseId: string) {
    this.server?.to(`public:event:${eventId}`).emit('result:unreleased', { id: releaseId })
  }
}
