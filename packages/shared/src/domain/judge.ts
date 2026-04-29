import type { Category } from './category'

export interface Judge {
  id: string
  userId: string
  eventId: string
  displayName: string
  createdAt: string
}

export interface JudgeWithCategories extends Judge {
  categories: Category[]
}
