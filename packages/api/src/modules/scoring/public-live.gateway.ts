import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  namespace: '/public-live',
  cors: {
    origin: '*',
  },
})
export class PublicLiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(PublicLiveGateway.name)

  handleConnection(client: Socket) {
    try {
      const eventId = client.handshake.query.eventId as string
      if (!eventId) {
        this.logger.error('No eventId provided in public-live handshake')
        client.disconnect(true)
        return
      }

      this.logger.log(`Public client connected: ${client.id} to event: ${eventId}`)
      void client.join(`public:event:${eventId}`)
    } catch (err) {
      this.logger.error('Public WebSocket connection failed', err)
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Public client disconnected: ${client.id}`)
  }

  emitToEvent(eventId: string, event: string, payload: unknown) {
    if (this.server) {
      this.server.to(`public:event:${eventId}`).emit(event, payload)
    }
  }
}
