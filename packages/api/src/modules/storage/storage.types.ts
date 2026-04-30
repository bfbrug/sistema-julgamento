export type StorageCategory = 'participant-photo' | 'certificate-background' | 'certificate-signature' | 'reports'

export interface UploadInput {
  buffer: Buffer
  originalName: string
  mimeType: string
  category: StorageCategory
  eventId?: string
}

export interface UploadedFileMetadata {
  path: string       // path interno (chave no storage)
  publicUrl: string  // URL para uso no frontend
  mimeType: string
  sizeBytes: number
}
