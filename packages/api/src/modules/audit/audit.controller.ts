import { Controller, Get, Param, Query, Inject, NotFoundException } from '@nestjs/common'
import { AuditService } from './audit.service'
import { ListAuditDto } from './dto/list-audit.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { plainToInstance } from 'class-transformer'
import { AuditResponseDto } from './dto/audit-response.dto'

@Roles('GESTOR')
@Controller('audit')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: ListAuditDto) {
    const { data, nextCursor } = await this.auditService.list({
      cursor: query.cursor,
      limit: query.limit ?? 50,
      action: query.action,
      actorId: query.actorId,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate,
      endDate: query.endDate,
    })

    return {
      data: data.map((log) =>
        plainToInstance(
          AuditResponseDto,
          {
            ...log,
            actorName: (log as any).actor?.name ?? undefined,
          },
          { excludeExtraneousValues: true },
        ),
      ),
      nextCursor,
      hasMore: nextCursor !== null,
    }
  }

  @Get('events/:eventId')
  async listByEvent(@Param('eventId') eventId: string, @Query() query: ListAuditDto) {
    const { data, nextCursor } = await this.auditService.list({
      cursor: query.cursor,
      limit: query.limit,
      action: query.action,
      actorId: query.actorId,
      entityType: query.entityType,
      entityId: eventId,
      startDate: query.startDate,
      endDate: query.endDate,
    })

    return {
      data: data.map((log) =>
        plainToInstance(
          AuditResponseDto,
          {
            ...log,
            actorName: (log as any).actor?.name ?? undefined,
          },
          { excludeExtraneousValues: true },
        ),
      ),
      nextCursor,
      hasMore: nextCursor !== null,
    }
  }

  @Get('users/:userId')
  async listByActor(@Param('userId') userId: string, @Query() query: ListAuditDto) {
    const { data, nextCursor } = await this.auditService.list({
      cursor: query.cursor,
      limit: query.limit,
      action: query.action,
      actorId: userId,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate,
      endDate: query.endDate,
    })

    return {
      data: data.map((log) =>
        plainToInstance(
          AuditResponseDto,
          {
            ...log,
            actorName: (log as any).actor?.name ?? undefined,
          },
          { excludeExtraneousValues: true },
        ),
      ),
      nextCursor,
      hasMore: nextCursor !== null,
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const log = await this.auditService.findById(id)
    if (!log) {
      throw new NotFoundException('Registro de auditoria não encontrado')
    }

    return plainToInstance(
      AuditResponseDto,
      {
        ...log,
        actorName: (log as any).actor?.name ?? undefined,
      },
      { excludeExtraneousValues: true },
    )
  }
}
