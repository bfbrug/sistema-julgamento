export interface Score {
  id: string
  participantId: string
  judgeId: string
  categoryId: string
  value: number
  isFinalized: boolean
  createdAt: string
  updatedAt: string
  finalizedAt: string | null
}
