export interface CertificateConfig {
  id: string
  eventId: string
  backgroundPath: string | null
  createdAt: string
  updatedAt: string
}

export interface CertificateSignature {
  id: string
  certificateConfigId: string
  personName: string
  personRole: string
  imagePath: string
  displayOrder: number
}
