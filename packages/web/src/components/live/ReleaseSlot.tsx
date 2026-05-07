import { cn } from '@/lib/utils'
import { Lock, Unlock, RotateCcw } from 'lucide-react'

interface ReleasedEntry {
  id: string
  participantName: string
  score: number
}

interface Props {
  position: number
  gender: 'MALE' | 'FEMALE' | null
  released?: ReleasedEntry
  prevReleased: boolean
  onRelease: () => void
  onRevert: () => void
  isPending?: boolean
}

export function ReleaseSlot({ position, released, prevReleased, onRelease, onRevert, isPending }: Props) {
  if (released) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {position}º
          </span>
          <div>
            <p className="text-sm font-semibold text-secondary-900">{released.participantName}</p>
            <p className="text-xs text-secondary-500">{released.score.toFixed(2)} pts</p>
          </div>
        </div>
        <button
          onClick={onRevert}
          disabled={isPending}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-danger-600 hover:bg-danger-50 disabled:opacity-50"
          title="Reverter"
        >
          <RotateCcw className="h-3 w-3" />
          Reverter
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg border border-dashed px-3 py-2',
      prevReleased ? 'border-secondary-300 bg-white' : 'border-secondary-200 bg-secondary-50 opacity-50',
    )}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-100 text-xs font-bold text-secondary-500">
          {position}º
        </span>
        <p className="text-sm text-secondary-400 italic">— oculto —</p>
      </div>
      <button
        onClick={onRelease}
        disabled={!prevReleased || isPending}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {prevReleased ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
        Liberar
      </button>
    </div>
  )
}
