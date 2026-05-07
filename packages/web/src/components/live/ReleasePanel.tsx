'use client'

import { useLiveResults } from '@/hooks/useLiveResults'
import { ReleaseSlot } from './ReleaseSlot'
import type { CategoryGenderMode } from '@judging/shared'

interface RankEntry {
  participantId: string
  name: string
  totalScore: number
  position: number
}

interface RankingResult {
  mode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT'
  entries?: RankEntry[]
  male?: RankEntry[]
  female?: RankEntry[]
}

interface CategoryWithRanking {
  id: string
  name: string
  genderMode: CategoryGenderMode
  ranking: RankingResult
}

interface Props {
  eventId: string
  categories: CategoryWithRanking[]
}

export function ReleasePanel({ eventId, categories }: Props) {
  const { releases, release, revert } = useLiveResults(eventId)

  const renderColumn = (
    cat: CategoryWithRanking,
    gender: 'MALE' | 'FEMALE' | null,
    entries: RankEntry[],
  ) => {
    const sorted = [...entries].sort((a, b) => b.position - a.position)
    const maxPosition = Math.max(...entries.map((e) => e.position))

    return (
      <div className="space-y-2">
        {sorted.map((entry) => {
          const rel = releases.find(
            (r) => r.categoryId === cat.id && r.gender === gender && r.position === entry.position,
          )
          const isLast = entry.position === maxPosition
          const prevReleased = isLast
            ? true
            : releases.some(
                (r) => r.categoryId === cat.id && r.gender === gender && r.position === entry.position + 1,
              )

          return (
            <ReleaseSlot
              key={entry.position}
              position={entry.position}
              gender={gender}
              released={rel ? { id: rel.id, participantName: entry.name, score: entry.totalScore } : undefined}
              prevReleased={prevReleased}
              isPending={release.isPending || revert.isPending}
              onRelease={() => release.mutate({ categoryId: cat.id, gender, position: entry.position })}
              onRevert={() => rel && revert.mutate(rel.id)}
            />
          )
        })}
      </div>
    )
  }

  return (
    <section className="mt-6 space-y-4">
      <h2 className="text-lg font-bold text-secondary-900">Liberação de Resultados</h2>
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-secondary-900">{cat.name}</h3>
            <span className="text-xs text-secondary-400 bg-secondary-100 px-2 py-0.5 rounded-full">
              {cat.genderMode}
            </span>
          </div>

          {cat.ranking.mode === 'UNISEX_SPLIT' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-blue-600 uppercase">Masculino</p>
                {renderColumn(cat, 'MALE', cat.ranking.male ?? [])}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-pink-600 uppercase">Feminino</p>
                {renderColumn(cat, 'FEMALE', cat.ranking.female ?? [])}
              </div>
            </div>
          ) : cat.ranking.mode === 'MALE_ONLY' ? (
            renderColumn(cat, 'MALE', cat.ranking.entries ?? [])
          ) : cat.ranking.mode === 'FEMALE_ONLY' ? (
            renderColumn(cat, 'FEMALE', cat.ranking.entries ?? [])
          ) : (
            renderColumn(cat, null, cat.ranking.entries ?? [])
          )}
        </div>
      ))}
    </section>
  )
}
