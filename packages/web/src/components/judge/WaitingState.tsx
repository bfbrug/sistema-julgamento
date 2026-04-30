'use client'

import { ConnectionStatus, type ConnectionStatusType } from './ConnectionStatus'

interface WaitingStateProps {
  connectionStatus: ConnectionStatusType
  onRetryConnection?: () => void
}

export function WaitingState({ connectionStatus, onRetryConnection }: WaitingStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary-500" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-secondary-900">
        Aguardando próximo participante
      </h2>
      <p className="max-w-md text-secondary-500">
        O gestor irá ativar o próximo participante em instantes
      </p>
      <ConnectionStatus status={connectionStatus} onRetry={onRetryConnection} />
    </div>
  )
}
