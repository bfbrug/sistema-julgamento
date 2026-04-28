import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

export interface RecordAuditInput {
  action: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: any;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectPinoLogger(AuditService.name) private readonly logger: PinoLogger,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    // STUB P03: apenas loga via Pino. Implementação real em P19 com tabela AuditLog.
    // TODO P19: persistir no banco com transação.
    this.logger.info({ audit: input }, 'Audit event recorded');
  }
}
