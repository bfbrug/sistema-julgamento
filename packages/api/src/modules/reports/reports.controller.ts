import {
  Controller, Post, Get, Param, Body, Req, Res, HttpCode, Inject,
} from '@nestjs/common'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole, ReportType } from '@prisma/client'
import { ReportsService } from './reports.service'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import type { FastifyReply } from 'fastify'
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
    @Inject(ReportsService) private readonly reportsService: ReportsService,
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
    @Res() res: FastifyReply,
  ) {
    const reportType = type.toUpperCase() as ReportType
    const filePath = await this.reportsService.download(eventId, req.user.sub, reportType)

    const absPath = path.resolve(env.STORAGE_LOCAL_ROOT, filePath)
    const filename = path.basename(absPath)

    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(fs.createReadStream(absPath))
  }

  @Get()
  async listJobs(
    @Param('eventId') eventId: string,
  ) {
    return this.reportsService.listJobsByEvent(eventId)
  }
}
