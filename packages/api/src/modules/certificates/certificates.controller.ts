import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '@prisma/client'
import { CertificatesService } from './certificates.service'
import { UpdateCertificateConfigDto } from './dto/update-config.dto'
import { UpdateSignatureDto } from './dto/update-signature.dto'
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.service.interface'
import { env } from '../../config/env'
import * as fs from 'fs'
import * as path from 'path'

@Controller('events/:eventId/certificates')
@Roles(UserRole.GESTOR)
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get('config')
  async getConfig(
    @Param('eventId') eventId: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.certificatesService.getConfig(eventId, req.user.sub)
  }

  @Put('config')
  async updateConfig(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateCertificateConfigDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.certificatesService.updateText(eventId, req.user.sub, dto)
  }

  @Post('background')
  @HttpCode(HttpStatus.CREATED)
  async uploadBackground(
    @Param('eventId') eventId: string,
    @Req() req: FastifyRequest,
    @Req() reqUser: { user: { sub: string } },
  ) {
    const data = await req.file()
    if (!data) {
      return { error: 'Nenhum arquivo enviado' }
    }

    const buffer = await data.toBuffer()
    return this.certificatesService.uploadBackground(eventId, reqUser.user.sub, buffer, data.filename)
  }

  @Delete('background')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBackground(
    @Param('eventId') eventId: string,
    @Req() req: { user: { sub: string } },
  ) {
    await this.certificatesService.removeBackground(eventId, req.user.sub)
  }

  @Post('signatures')
  @HttpCode(HttpStatus.CREATED)
  async addSignature(
    @Param('eventId') eventId: string,
    @Req() req: FastifyRequest,
    @Req() reqUser: { user: { sub: string } },
  ) {
    const data = await req.file()
    if (!data) {
      return { error: 'Nenhum arquivo enviado' }
    }

    const buffer = await data.toBuffer()

    // Read fields from multipart
    const fields = data.fields as Record<string, { value: string } | undefined>
    const personName = fields?.personName?.value ?? ''
    const personRole = fields?.personRole?.value ?? ''
    const displayOrder = parseInt(fields?.displayOrder?.value ?? '1', 10)

    return this.certificatesService.addSignature(
      eventId,
      reqUser.user.sub,
      buffer,
      data.filename,
      personName,
      personRole,
      displayOrder,
    )
  }

  @Put('signatures/:id')
  async updateSignature(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSignatureDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.certificatesService.updateSignature(eventId, req.user.sub, id, dto)
  }

  @Delete('signatures/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSignature(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Req() req: { user: { sub: string } },
  ) {
    await this.certificatesService.removeSignature(eventId, req.user.sub, id)
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Param('eventId') eventId: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.certificatesService.enqueueBatchGeneration(eventId, req.user.sub)
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.certificatesService.getJobStatus(jobId)
  }

  @Get('download')
  async download(
    @Param('eventId') eventId: string,
    @Req() req: { user: { sub: string } },
    @Res() res: FastifyReply,
  ) {
    const filePath = await this.certificatesService.download(eventId, req.user.sub)
    const absPath = path.resolve(env.STORAGE_LOCAL_ROOT, filePath)
    const filename = path.basename(absPath)

    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(fs.createReadStream(absPath))
  }
}
