import {
  Controller, Post, Get, Param, Body, Req, Res, HttpCode,
} from '@nestjs/common'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, ReportType } from '@prisma/client'
import { ReportsService } from './reports.service'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { Inject } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { env } from '../../config/env'

interface GenerateReportDto {
  type: ReportType
}

@Controller('events/:eventId/reports')
@Roles(UserRole.GESTOR)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Post('generate')
  @HttpCode(201)
  async generate(
    @Param('eventId') eventId: string,
    @Body() body: GenerateReportDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.reportsService.enqueue(eventId, req.user.sub, body.type)
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.reportsService.getJobStatus(jobId)
  }

  @Get(':type/download')
  async download(
    @Param('eventId') eventId: string,
    @Param('type') type: string,
    @Req() req: { user: { sub: string } },
    @Res() res: import('@fastify/reply-from').FastifyReply,
  ) {
    const reportType = type.toUpperCase() as ReportType
    const filePath = await this.reportsService.download(eventId, req.user.sub, reportType)

    const absPath = path.resolve(env.STORAGE_LOCAL_ROOT, filePath)
    const filename = path.basename(absPath)

    const fastifyRes = res as unknown as {
      header: (k: string, v: string) => void
      send: (stream: unknown) => void
    }
    fastifyRes.header('Content-Type', 'application/pdf')
    fastifyRes.header('Content-Disposition', `attachment; filename="${filename}"`)
    fastifyRes.send(fs.createReadStream(absPath))
  }

  @Get()
  async listJobs(
    @Param('eventId') eventId: string,
  ) {
    return this.reportsService.listJobsByEvent(eventId)
  }
}
