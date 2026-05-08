import { Trophy, Star, Scale } from 'lucide-react'
import type { TiebreakerInfo } from '@judging/shared'

interface FinalRankingItem {
  position: number
  participantName: string
  finalScore: number
  tiebreaker: TiebreakerInfo | null
}

interface EventFinishedViewProps {
  eventName: string
  ranking: FinalRankingItem[]
}

const medalStyles: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: 'bg-amber-400', text: 'text-white', border: 'border-amber-300', label: '1º' },
  2: { bg: 'bg-slate-400', text: 'text-white', border: 'border-slate-300', label: '2º' },
  3: { bg: 'bg-amber-700', text: 'text-white', border: 'border-amber-600', label: '3º' },
}

function TiebreakerBadge({ tiebreaker }: { tiebreaker: TiebreakerInfo | null }) {
  if (!tiebreaker || tiebreaker.resolvedBy === 'NONE') return null

  const detail = tiebreaker.details[0]
  const label = tiebreaker.resolvedBy === 'FIRST_CATEGORY'
    ? `Desempate: ${detail?.categoryName ?? '1º critério'}`
    : tiebreaker.resolvedBy === 'SECOND_CATEGORY'
    ? `Desempate: ${tiebreaker.details[1]?.categoryName ?? detail?.categoryName ?? '2º critério'}`
    : 'Empate não resolvido'

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
      <Scale className="h-3 w-3" />
      {label}
    </span>
  )
}

export function EventFinishedView({ eventName, ranking }: EventFinishedViewProps) {
  const hasAnyTiebreaker = ranking.some((item) => item.tiebreaker && item.tiebreaker.resolvedBy !== 'NONE')

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-8 py-12"
      style={{
        background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 40%, #fdf6e3 100%)',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-4">
        <Trophy
          className="h-14 w-14 drop-shadow-md"
          style={{ color: '#c9a227' }}
          aria-hidden="true"
        />
        <h2
          className="text-6xl font-black tracking-tight"
          style={{
            fontFamily: "'DM Sans', 'Inter', sans-serif",
            color: '#1a1208',
            letterSpacing: '-0.02em',
          }}
        >
          Resultado Final
        </h2>
        <Trophy
          className="h-14 w-14 drop-shadow-md"
          style={{ color: '#c9a227' }}
          aria-hidden="true"
        />
      </div>

      {/* Divider dourado */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px w-24" style={{ background: 'linear-gradient(to right, transparent, #c9a227)' }} />
        <Star className="h-4 w-4" style={{ color: '#c9a227' }} aria-hidden="true" />
        <p
          className="text-2xl font-semibold"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#6b5a2d' }}
        >
          {eventName}
        </p>
        <Star className="h-4 w-4" style={{ color: '#c9a227' }} aria-hidden="true" />
        <div className="h-px w-24" style={{ background: 'linear-gradient(to left, transparent, #c9a227)' }} />
      </div>

      {hasAnyTiebreaker && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-700">
          <Scale className="h-3 w-3" />
          <span>Os indicadores de desempate mostram qual critério definiu a colocaºo.</span>
        </div>
      )}

      {/* Ranking */}
      <div className="w-full max-w-3xl">
        <ul className="flex flex-col gap-3">
          {ranking.map((item, index) => {
            const medal = medalStyles[item.position]
            const isTop3 = item.position <= 3
            const hasTiebreaker = item.tiebreaker && item.tiebreaker.resolvedBy !== 'NONE'
            return (
              <li
                key={index}
                className={`flex items-center justify-between rounded-2xl px-6 py-4 transition-all ${
                  isTop3
                    ? 'shadow-lg'
                    : 'shadow-sm'
                }`}
                style={{
                  background: isTop3
                    ? 'linear-gradient(135deg, #ffffff 0%, #fef9e7 100%)'
                    : '#ffffff',
                  border: isTop3 ? '1.5px solid #e8d89a' : '1.5px solid #e8e0d0',
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div className="flex items-center gap-5">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black shadow-md ${
                      medal ? `${medal.bg} ${medal.text}` : 'bg-stone-200 text-stone-500'
                    }`}
                    style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
                  >
                    {item.position}º
                  </span>
                  <div className="flex flex-col">
                    <span
                      className="text-2xl font-bold"
                      style={{
                        fontFamily: "'DM Sans', 'Inter', sans-serif",
                        color: '#1a1208',
                      }}
                    >
                      {item.participantName}
                    </span>
                    {hasTiebreaker && <TiebreakerBadge tiebreaker={item.tiebreaker} />}
                  </div>
                </div>
                <span
                  className="text-3xl font-black tabular-nums"
                  style={{
                    color: isTop3 ? '#c9a227' : '#6b5a2d',
                    fontFamily: "'DM Sans', 'Inter', sans-serif",
                  }}
                >
                  {item.finalScore.toFixed(2)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
