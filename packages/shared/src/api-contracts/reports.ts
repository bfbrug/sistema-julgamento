export type ReportType = 'TOP_N' | 'GENERAL' | 'DETAILED_BY_JUDGE'

export type ReportJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface ReportJob {
  id: string
  eventId: string
  type: ReportType
  status: ReportJobStatus
  progress: number
  filePath?: string
  verificationCode?: string
  error?: string
  requestedBy: string
  createdAt: string
  completedAt?: string
}

export interface GenerateReportRequest {
  type: ReportType
}

export interface GenerateReportResponse {
  jobId: string
  status: 'queued'
  warning?: string
}
