import { Trophy } from 'lucide-react'

interface FinalRankingItem {
  position: number
  participantName: string
  finalScore: number
}

interface EventFinishedViewProps {
  eventName: string
  ranking: FinalRankingItem[]
}

export function EventFinishedView({ eventName, ranking }: EventFinishedViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-neutral-950 px-8 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="h-10 w-10 text-amber-400" aria-hidden="true" />
        <h2 className="text-4xl font-bold text-white">Resultado Final</h2>
      </div>
      <p className="mb-10 text-xl text-neutral-400">{eventName}</p>
      <div className="w-full max-w-3xl">
        <ul className="flex flex-col gap-3">
          {ranking.map((item, index) => {
            const isTop3 = item.position <= 3
            return (
              <li
                key={index}
                className={`flex items-center justify-between rounded-xl px-6 py-4 ${
                  isTop3 ? 'bg-neutral-800' : 'bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                      item.position === 1
                        ? 'bg-amber-500 text-neutral-950'
                        : item.position === 2
                          ? 'bg-neutral-300 text-neutral-950'
                          : item.position === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.position}º
                  </span>
                  <span className="text-xl font-medium text-white">
                    {item.participantName}
                  </span>
                </div>
                <span className="text-2xl font-bold text-white">
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
