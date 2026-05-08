export interface TiebreakerConfig {
  id: string
  eventId: string
  firstCategoryId: string | null
  secondCategoryId: string | null
}

export interface TiebreakerInfo {
  resolvedBy: 'NONE' | 'FIRST_CATEGORY' | 'SECOND_CATEGORY' | 'UNRESOLVED'
  details: Array<{
    rule: 'FIRST_CATEGORY' | 'SECOND_CATEGORY'
    categoryId: string
    categoryName: string
    myValue: number
    competitors: Array<{ participantId: string; value: number }>
  }>
}
