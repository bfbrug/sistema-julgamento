'use client'

import { useLiveResults } from '@/hooks/useLiveResults'
import { ReleaseSlot } from './ReleaseSlot'

interface RankEntry {
  participantId: string
  name: string
  totalScore: number
  position: number
}

interface OverallRanking {
  mode: 'MIXED' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'UNISEX_SPLIT'
  entries?: RankEntry[]
  male?: RankEntry[]
  female?: RankEntry[]
}

interface Props {
  eventId: string
  ranking: OverallRanking
}

export function ReleasePanel({ eventId, ranking }: Props) {
  const { releases, release, revert } = useLiveResults(eventId)

  const renderColumn = (gender: 'MALE' | 'FEMALE' | null, entries: RankEntry[]) => {
    const sorted = [...entries].sort((a, b) => b.position - a.position)
    const maxPosition = entries.length ? Math.max(...entries.map((e) => e.position)) : 0
    return (
      <div className="space-y-2">
        {sorted.map((entry) => {
          const rel = releases.find((r) => r.gender === gender && r.position === entry.position)
          const isLast = entry.position === maxPosition
          const prevReleased = isLast || releases.some(
            (r) => r.gender === gender && r.position === entry.position + 1,
          )
          return (
            <ReleaseSlot
              key={entry.position}
              position={entry.position}
              gender={gender}
              released={rel ? { id: rel.id, participantName: entry.name, score: entry.totalScore } : undefined}
              prevReleased={!!prevReleased}
              isPending={release.isPending || revert.isPending}
              onRelease={() => release.mutate({ gender, position: entry.position })}
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
      <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm">
        {ranking.mode === 'UNISEX_SPLIT' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-blue-600 uppercase">Masculino</p>
              {renderColumn('MALE', ranking.male ?? [])}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-pink-600 uppercase">Feminino</p>
              {renderColumn('FEMALE', ranking.female ?? [])}
            </div>
          </div>
        ) : ranking.mode === 'MALE_ONLY' ? (
          renderColumn('MALE', ranking.entries ?? [])
        ) : ranking.mode === 'FEMALE_ONLY' ? (
          renderColumn('FEMALE', ranking.entries ?? [])
        ) : (
          renderColumn(null, ranking.entries ?? [])
        )}
      </div>
    </section>
  )
}
