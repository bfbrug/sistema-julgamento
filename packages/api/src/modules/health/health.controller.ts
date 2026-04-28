import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { PrismaService } from '../../config/prisma.service'
import { Public } from '../../common/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(HealthController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @Public()
  async check(): Promise<{ status: string; timestamp: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'ok',
      }
    } catch (err) {
      this.logger.error({ err }, 'Health check falhou')
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      })
    }
  }
}
