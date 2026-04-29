import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { LocalStorageService } from '../local-storage.service'

// JPEG real (mínimo válido — header JFIF)
// FF D8 FF E0 00 10 4A 46 49 46 00 01 ...
const JPEG_MAGIC = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
  Buffer.alloc(500),
])

// PNG real (8 bytes de assinatura + header IHDR mínimo)
// 89 50 4E 47 0D 0A 1A 0A | 00 00 00 0D 49 48 44 52 ...
const PNG_MAGIC = Buffer.concat([
  Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
  ]),
  Buffer.alloc(500),
])

// GIF (inválido para foto)
const GIF_MAGIC = Buffer.concat([
  Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  Buffer.alloc(500),
])

// Buffer sem assinatura (arquivo falso)
const FAKE_FILE = Buffer.alloc(512, 0x00)

describe('LocalStorageService', () => {
  let service: LocalStorageService
  let testRoot: string

  beforeEach(() => {
    testRoot = path.join(os.tmpdir(), `judging-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    service = new LocalStorageService(testRoot)
  })

  afterEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true })
    }
  })

  describe('upload', () => {
    it('cria arquivo JPEG no path correto', async () => {
      const result = await service.upload({
        buffer: JPEG_MAGIC,
        originalName: 'foto.jpg',
        mimeType: 'image/jpeg',
        category: 'participant-photo',
        eventId: 'event-123',
      })

      expect(result.path).toMatch(/participant-photo\/event-123\//)
      expect(result.path).toMatch(/\.jpg$/)
      expect(result.mimeType).toBe('image/jpeg')

      const absPath = path.resolve(testRoot, result.path)
      expect(fs.existsSync(absPath)).toBe(true)
    })

    it('cria arquivo PNG no path correto', async () => {
      const result = await service.upload({
        buffer: PNG_MAGIC,
        originalName: 'foto.png',
        mimeType: 'image/png',
        category: 'participant-photo',
        eventId: 'event-123',
      })

      expect(result.path).toMatch(/\.png$/)
      expect(result.mimeType).toBe('image/png')
    })

    it('rejeita GIF (magic bytes inválidos) mesmo com mimeType declarado como jpeg', async () => {
      await expect(
        service.upload({
          buffer: GIF_MAGIC,
          originalName: 'foto.jpg',
          mimeType: 'image/jpeg',
          category: 'participant-photo',
          eventId: 'event-123',
        }),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'INVALID_FILE_TYPE')
    })

    it('rejeita arquivo sem magic bytes reconhecidos', async () => {
      await expect(
        service.upload({
          buffer: FAKE_FILE,
          originalName: 'foto.jpg',
          mimeType: 'image/jpeg',
          category: 'participant-photo',
          eventId: 'event-123',
        }),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'INVALID_FILE_TYPE')
    })

    it('rejeita arquivo maior que o limite (2MB)', async () => {
      // Cria buffer que excede 2MB com magic bytes JPEG válidos
      const big = Buffer.concat([JPEG_MAGIC, Buffer.alloc(3 * 1024 * 1024)])
      await expect(
        service.upload({
          buffer: big,
          originalName: 'foto.jpg',
          mimeType: 'image/jpeg',
          category: 'participant-photo',
          eventId: 'event-123',
        }),
      ).rejects.toSatisfy((e: any) => e?.response?.code === 'FILE_TOO_LARGE')
    })

    it('gera nome UUID, não usa nome original do upload', async () => {
      const result = await service.upload({
        buffer: JPEG_MAGIC,
        originalName: 'minha-foto-original.jpg',
        mimeType: 'image/jpeg',
        category: 'participant-photo',
        eventId: 'event-123',
      })

      expect(result.path).not.toContain('minha-foto-original')
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(result.path).toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
      )
    })

    it('cria sem eventId (sem subpasta de evento)', async () => {
      const result = await service.upload({
        buffer: JPEG_MAGIC,
        originalName: 'foto.jpg',
        mimeType: 'image/jpeg',
        category: 'participant-photo',
      })

      expect(result.path).toMatch(/^participant-photo\//)
      expect(result.path).not.toContain('undefined')
    })
  })

  describe('remove', () => {
    it('deleta arquivo existente', async () => {
      const uploaded = await service.upload({
        buffer: JPEG_MAGIC,
        originalName: 'foto.jpg',
        mimeType: 'image/jpeg',
        category: 'participant-photo',
        eventId: 'event-123',
      })

      const absPath = path.resolve(testRoot, uploaded.path)
      expect(fs.existsSync(absPath)).toBe(true)

      await service.remove(uploaded.path)

      expect(fs.existsSync(absPath)).toBe(false)
    })

    it('não falha ao remover arquivo inexistente (idempotente)', async () => {
      await expect(service.remove('participant-photo/evento/inexistente.jpg')).resolves.not.toThrow()
    })
  })

  describe('getPublicUrl', () => {
    it('retorna URL relativa correta', async () => {
      const url = await service.getPublicUrl('participant-photo/event-123/uuid.jpg')
      expect(url).toBe('/uploads/participant-photo/event-123/uuid.jpg')
    })

    it('normaliza barras invertidas (Windows)', async () => {
      const url = await service.getPublicUrl('participant-photo\\event-123\\uuid.jpg')
      expect(url).toBe('/uploads/participant-photo/event-123/uuid.jpg')
    })
  })

  describe('exists', () => {
    it('retorna true para arquivo existente', async () => {
      const uploaded = await service.upload({
        buffer: JPEG_MAGIC,
        originalName: 'foto.jpg',
        mimeType: 'image/jpeg',
        category: 'participant-photo',
        eventId: 'event-123',
      })
      expect(await service.exists(uploaded.path)).toBe(true)
    })

    it('retorna false para arquivo inexistente', async () => {
      expect(await service.exists('participant-photo/naoexiste/file.jpg')).toBe(false)
    })

    it('retorna false para path traversal (../../etc/passwd)', async () => {
      expect(await service.exists('../../etc/passwd')).toBe(false)
    })
  })

  describe('path traversal', () => {
    it('originalName com path traversal não afeta o path gerado (usa UUID)', async () => {
      const result = await service.upload({
        buffer: JPEG_MAGIC,
        originalName: '../../etc/passwd',
        mimeType: 'image/jpeg',
        category: 'participant-photo',
        eventId: 'event-safe',
      })
      // O nome do arquivo deve ser UUID, não o originalName
      expect(result.path).not.toContain('..')
      expect(result.path).not.toContain('etc')
      expect(result.path).not.toContain('passwd')
    })
  })
})
