import { Injectable, OnModuleDestroy } from '@nestjs/common'
import puppeteer, { Browser } from 'puppeteer'

export interface PdfOptions {
  format?: 'A4' | 'A3' | 'Letter'
  landscape?: boolean
  margin?: { top: string; right: string; bottom: string; left: string }
}

@Injectable()
export class PdfService implements OnModuleDestroy {
  private browser: Browser | undefined

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    }
    return this.browser
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close()
  }

  async render(html: string, options: PdfOptions = {}): Promise<Buffer> {
    const browser = await this.ensureBrowser()
    const page = await browser.newPage()
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' })
      const buffer = await page.pdf({
        format: options.format ?? 'A4',
        landscape: options.landscape ?? false,
        printBackground: true,
        margin: options.margin ?? { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      })
      return Buffer.from(buffer)
    } finally {
      await page.close()
    }
  }
}
