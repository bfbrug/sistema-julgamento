import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockClose, mockPdf, mockSetContent, mockBrowser } = vi.hoisted(() => {
  const mockClose = vi.fn().mockResolvedValue(undefined)
  const mockPdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4'))
  const mockSetContent = vi.fn().mockResolvedValue(undefined)
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue({ setContent: mockSetContent, pdf: mockPdf, close: mockClose }),
    close: vi.fn().mockResolvedValue(undefined),
  }
  return { mockClose, mockPdf, mockSetContent, mockBrowser }
})

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}))

import { PdfService } from '../pdf.service'

describe('PdfService', () => {
  let service: PdfService

  beforeEach(async () => {
    vi.clearAllMocks()
    mockBrowser.newPage.mockResolvedValue({ setContent: mockSetContent, pdf: mockPdf, close: mockClose })
    mockPdf.mockResolvedValue(Buffer.from('%PDF-1.4'))
    service = new PdfService()
    await service.onModuleInit()
  })

  it('onModuleInit lança browser', () => {
    // verified by beforeEach — browser launched without throwing
    expect(mockBrowser).toBeDefined()
  })

  it('render chama setContent e pdf, fecha page no finally', async () => {
    const result = await service.render('<html></html>')
    expect(mockSetContent).toHaveBeenCalledWith('<html></html>', { waitUntil: 'networkidle0' })
    expect(mockPdf).toHaveBeenCalled()
    expect(mockClose).toHaveBeenCalled()
    expect(result).toBeInstanceOf(Buffer)
  })

  it('fecha page mesmo quando pdf() lança erro', async () => {
    mockPdf.mockRejectedValueOnce(new Error('PDF error'))
    await expect(service.render('<html></html>')).rejects.toThrow('PDF error')
    expect(mockClose).toHaveBeenCalled()
  })

  it('onModuleDestroy fecha browser', async () => {
    await service.onModuleDestroy()
    expect(mockBrowser.close).toHaveBeenCalled()
  })

  it('render usa landscape quando especificado', async () => {
    await service.render('<html></html>', { landscape: true })
    expect(mockPdf).toHaveBeenCalledWith(expect.objectContaining({ landscape: true }))
  })
})
