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
    if (this.browser && this.browser.connected) {
      return this.browser
    }

    if (this.browser) {
      try {
        await this.browser.close()
      } catch {
        // ignore cleanup errors
      }
      this.browser = undefined
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ],
    })

    this.browser.on('disconnected', () => {
      this.browser = undefined
    })

    return this.browser
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close()
      } catch {
        // ignore cleanup errors
      }
      this.browser = undefined
    }
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

  async renderFile(filePath: string, options: PdfOptions = {}): Promise<Buffer> {
    const browser = await this.ensureBrowser()
    const page = await browser.newPage()
    try {
      const url = 'file:///' + filePath.replace(/\\/g, '/')
      await page.goto(url, { waitUntil: 'networkidle0' })
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
