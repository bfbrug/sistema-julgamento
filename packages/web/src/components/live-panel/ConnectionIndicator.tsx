import type { ConnectionStatus } from '@/hooks/usePublicLivePanel'

interface ConnectionIndicatorProps {
  status: ConnectionStatus
}

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const colorClass =
    status === 'connected'
      ? 'bg-emerald-500'
      : status === 'reconnecting'
        ? 'bg-amber-500'
        : 'bg-red-500'

  const label =
    status === 'connected'
      ? 'ao vivo'
      : status === 'reconnecting'
        ? 'reconectando...'
        : 'desconectado'

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} aria-hidden="true" />
      <span className="uppercase tracking-wider">{label}</span>
    </div>
  )
}
