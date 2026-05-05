import { Trophy, Star } from 'lucide-react'

interface FinalRankingItem {
  position: number
  participantName: string
  finalScore: number
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

export function EventFinishedView({ eventName, ranking }: EventFinishedViewProps) {
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

      {/* Ranking */}
      <div className="w-full max-w-3xl">
        <ul className="flex flex-col gap-3">
          {ranking.map((item, index) => {
            const medal = medalStyles[item.position]
            const isTop3 = item.position <= 3
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
                  <span
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: "'DM Sans', 'Inter', sans-serif",
                      color: '#1a1208',
                    }}
                  >
                    {item.participantName}
                  </span>
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
