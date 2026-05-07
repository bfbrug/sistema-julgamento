export type CategoryGenderMode = 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT'

export interface Category {
  id: string
  eventId: string
  name: string
  displayOrder: number
  genderMode: CategoryGenderMode
}
