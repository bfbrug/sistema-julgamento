export interface CertificateConfig {
  id: string | null
  eventId: string
  backgroundPath: string | null
  signatures: CertificateSignature[]
  certificateText: string
}

export interface CertificateSignature {
  id: string
  personName: string
  personRole: string
  imagePath: string
  displayOrder: 1 | 2 | 3
}

export type CertificateBatchJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface CertificateBatchJob {
  jobId: string
  status: CertificateBatchJobStatus
  progress: number
  totalParticipants: number
  filePath?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export interface UpdateCertificateConfigRequest {
  certificateText: string
}

export interface UpdateCertificateConfigResponse {
  certificateText: string
  warnings?: string[]
}

export interface UploadBackgroundResponse {
  path: string
  publicUrl: string
  warning?: string
}

export interface AddSignatureRequest {
  personName: string
  personRole: string
  displayOrder: 1 | 2 | 3
}

export interface AddSignatureResponse {
  id: string
  personName: string
  personRole: string
  imagePath: string
  displayOrder: 1 | 2 | 3
}

export interface UpdateSignatureRequest {
  personName?: string
  personRole?: string
  displayOrder?: 1 | 2 | 3
}

export interface GenerateBatchResponse {
  jobId: string
  status: 'queued'
}
