import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { env } from '../../config/env'

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const req = ctx.getRequest<FastifyRequest>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const response = exception.getResponse() as Record<string, unknown>

      const message = Array.isArray(response['message'])
        ? response['message']
        : (response['message'] ?? exception.message)

      void reply.status(status).send({
        error: message,
        ...(response['code'] !== undefined && { code: response['code'] }),
        ...(response['details'] !== undefined && { details: response['details'] }),
      })
      return
    }

    this.logger.error({ err: exception, path: req.url }, 'Exceção não tratada')

    const message =
      env.NODE_ENV === 'development' && exception instanceof Error
        ? exception.message
        : 'Erro interno do servidor'

    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: message })
  }
}
