import { CanActivate, ExecutionContext, Injectable, Inject, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name)

  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient()
      const token = this.extractTokenFromHeader(client)

      if (!token) {
        this.logger.error('No token found in WebSocket handshake')
        throw new WsException('Unauthorized')
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      })

      // Atribui o usuário ao cliente para uso posterior
      ;(client as Socket & { user?: unknown }).user = payload
      return true
    } catch (err) {
      this.logger.error('WebSocket JWT verification failed', err)
      throw new WsException('Unauthorized')
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Tenta pegar do query params ou do header auth
    const token = client.handshake.auth?.token || client.handshake.query?.token
    return Array.isArray(token) ? token[0] : token
  }
}
