import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { fileTypeFromBuffer } from 'file-type'
import { env } from '../../config/env'
import { IStorageService } from './storage.service.interface'
import { UploadInput, UploadedFileMetadata } from './storage.types'
import { AppException } from '../../common/exceptions/app.exception'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

const CATEGORY_MAX_BYTES: Record<string, number> = {
  'participant-photo': env.PARTICIPANT_PHOTO_MAX_BYTES,
  'certificate-background': 10 * 1024 * 1024, // 10 MB
  'certificate-signature': 5 * 1024 * 1024,   // 5 MB
}

const CATEGORY_ALLOWED_MIMES: Record<string, string[]> = {
  'participant-photo': env.PARTICIPANT_PHOTO_ALLOWED_MIMES.split(',').map((m) => m.trim()),
  'certificate-background': ['image/jpeg', 'image/png'],
  'certificate-signature': ['image/jpeg', 'image/png'],
}

/**
 * Implementação local do IStorageService.
 * Armazena arquivos em disco; prepara interface para futura evolução a S3.
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly root: string

  constructor(rootOverride?: string) {
    this.root = path.resolve(rootOverride ?? env.STORAGE_LOCAL_ROOT)
    fs.mkdirSync(this.root, { recursive: true })
  }

  async upload(input: UploadInput): Promise<UploadedFileMetadata> {
    // RN-10.5: validar MIME por magic bytes
    const detectedType = await fileTypeFromBuffer(input.buffer)
    const detectedMime = detectedType?.mime ?? null

    const allowedMimes = CATEGORY_ALLOWED_MIMES[input.category] ?? []
    if (!detectedMime || !allowedMimes.includes(detectedMime)) {
      throw new AppException(
        `Tipo de arquivo inválido. Permitidos: ${allowedMimes.join(', ')}`,
        422,
        'INVALID_FILE_TYPE',
      )
    }

    const maxBytes = CATEGORY_MAX_BYTES[input.category] ?? env.PARTICIPANT_PHOTO_MAX_BYTES
    if (input.buffer.length > maxBytes) {
      throw new AppException(
        `Arquivo excede o tamanho máximo de ${maxBytes} bytes`,
        422,
        'FILE_TOO_LARGE',
      )
    }

    const ext = MIME_TO_EXT[detectedMime] ?? 'bin'
    const filename = `${randomUUID()}.${ext}`

    // Estrutura interna: <category>/<eventId?>/<filename>
    const relDir = input.eventId
      ? path.join(input.category, input.eventId)
      : input.category
    const absDir = path.join(this.root, relDir)
    fs.mkdirSync(absDir, { recursive: true })

    const relPath = path.join(relDir, filename)

    // Proteção contra path traversal
    const absPath = path.resolve(absDir, filename)
    if (!absPath.startsWith(this.root)) {
      throw new AppException('Caminho inválido', 400, 'INVALID_PATH')
    }

    fs.writeFileSync(absPath, input.buffer)

    const publicUrl = await this.getPublicUrl(relPath)

    return {
      path: relPath.replace(/\\/g, '/'),
      publicUrl,
      mimeType: detectedMime,
      sizeBytes: input.buffer.length,
    }
  }

  async remove(storagePath: string): Promise<void> {
    const absPath = path.resolve(this.root, storagePath)
    if (!absPath.startsWith(this.root)) {
      throw new AppException('Caminho inválido', 400, 'INVALID_PATH')
    }
    try {
      fs.unlinkSync(absPath)
    } catch (err: unknown) {
      // Idempotente: não falha se arquivo não existe
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }
  }

  async getPublicUrl(storagePath: string): Promise<string> {
    const normalized = storagePath.replace(/\\/g, '/')
    return `/uploads/${normalized}`
  }

  async exists(storagePath: string): Promise<boolean> {
    const absPath = path.resolve(this.root, storagePath)
    if (!absPath.startsWith(this.root)) {
      return false
    }
    return fs.existsSync(absPath)
  }
}
