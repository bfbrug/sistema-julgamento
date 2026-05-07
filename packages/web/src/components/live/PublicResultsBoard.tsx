import { Trophy, Star } from 'lucide-react'
import type { PublicResults, ReleasedEntry } from '@/hooks/usePublicResults'

interface Props {
  eventName: string
  results: PublicResults
}

const medalStyles: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-amber-400', text: 'text-white' },
  2: { bg: 'bg-slate-400', text: 'text-white' },
  3: { bg: 'bg-amber-700', text: 'text-white' },
}

function EntryCard({ entry }: { entry: ReleasedEntry }) {
  const medal = medalStyles[entry.position]
  const isTop3 = entry.position <= 3
  return (
    <li
      className={`flex items-center justify-between rounded-2xl px-6 py-4 ${isTop3 ? 'shadow-lg' : 'shadow-sm'}`}
      style={{
        background: isTop3 ? 'linear-gradient(135deg, #ffffff 0%, #fef9e7 100%)' : '#ffffff',
        border: isTop3 ? '1.5px solid #e8d89a' : '1.5px solid #e8e0d0',
      }}
    >
      <div className="flex items-center gap-5">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black shadow-md ${
            medal ? `${medal.bg} ${medal.text}` : 'bg-stone-200 text-stone-500'
          }`}
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
          {entry.position}º
        </span>
        <span
          className="text-2xl font-bold"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#1a1208' }}
        >
          {entry.name}
        </span>
      </div>
      <span
        className="text-3xl font-black tabular-nums"
        style={{ color: isTop3 ? '#c9a227' : '#6b5a2d', fontFamily: "'DM Sans', 'Inter', sans-serif" }}
      >
        {entry.totalScore.toFixed(2)}
      </span>
    </li>
  )
}

function RankingColumn({ entries, label }: { entries: ReleasedEntry[] | undefined; label?: string }) {
  const sorted = [...(entries ?? [])].sort((a, b) => a.position - b.position)
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <h4 className="text-center text-xl font-bold uppercase tracking-widest" style={{ color: '#c9a227' }}>
          {label}
        </h4>
      )}
      <ul className="flex flex-col gap-3">
        {sorted.map((e) => (
          <EntryCard key={`${e.position}-${e.participantId}`} entry={e} />
        ))}
      </ul>
    </div>
  )
}

export function PublicResultsBoard({ eventName, results }: Props) {
  const { eventGenderMode, released } = results
  const totalReleased =
    (released.MIXED?.length ?? 0) + (released.MALE?.length ?? 0) + (released.FEMALE?.length ?? 0)

  if (totalReleased === 0) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-4"
        style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 100%)' }}
      >
        <Trophy className="h-16 w-16" style={{ color: '#c9a227' }} />
        <h2
          className="text-4xl font-black"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#1a1208' }}
        >
          Aguardando divulgação dos resultados
        </h2>
        <p className="text-xl font-medium" style={{ color: '#8a7040' }}>
          {eventName}
        </p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen px-8 py-12"
      style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 100%)' }}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <Trophy className="h-14 w-14 drop-shadow-md" style={{ color: '#c9a227' }} />
          <h2
            className="text-6xl font-black tracking-tight"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#1a1208' }}
          >
            Resultado Final
          </h2>
          <Trophy className="h-14 w-14 drop-shadow-md" style={{ color: '#c9a227' }} />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px w-24" style={{ background: 'linear-gradient(to right, transparent, #c9a227)' }} />
          <Star className="h-4 w-4" style={{ color: '#c9a227' }} />
          <p className="text-2xl font-semibold" style={{ color: '#6b5a2d' }}>{eventName}</p>
          <Star className="h-4 w-4" style={{ color: '#c9a227' }} />
          <div className="h-px w-24" style={{ background: 'linear-gradient(to left, transparent, #c9a227)' }} />
        </div>
      </div>

      {/* Ranking */}
      <div className="mx-auto max-w-5xl">
        {eventGenderMode === 'UNISEX_SPLIT' ? (
          <div className="grid grid-cols-2 gap-8">
            <RankingColumn entries={released.MALE} label="Masculino" />
            <RankingColumn entries={released.FEMALE} label="Feminino" />
          </div>
        ) : eventGenderMode === 'MALE_ONLY' ? (
          <RankingColumn entries={released.MALE} label="Masculino" />
        ) : eventGenderMode === 'FEMALE_ONLY' ? (
          <RankingColumn entries={released.FEMALE} label="Feminino" />
        ) : (
          <RankingColumn entries={released.MIXED} />
        )}
      </div>
    </div>
  )
}
