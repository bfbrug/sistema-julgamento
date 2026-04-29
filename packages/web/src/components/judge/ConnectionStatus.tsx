'use client'

import { useState, useEffect } from 'react'

type ConnectionStatusType = 'connected' | 'reconnecting' | 'disconnected'

interface ConnectionStatusProps {
  status: ConnectionStatusType
  onRetry?: () => void
}

export function ConnectionStatus({ status, onRetry }: ConnectionStatusProps) {
  const [showReconnecting, setShowReconnecting] = useState(false)
  const [showDisconnected, setShowDisconnected] = useState(false)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>
    let disconnectTimer: ReturnType<typeof setTimeout>

    if (status === 'connected') {
      setShowReconnecting(false)
      setShowDisconnected(false)
    } else if (status === 'reconnecting') {
      reconnectTimer = setTimeout(() => setShowReconnecting(true), 3000)
    } else if (status === 'disconnected') {
      disconnectTimer = setTimeout(() => setShowDisconnected(true), 10000)
    }

    return () => {
      clearTimeout(reconnectTimer)
      clearTimeout(disconnectTimer)
    }
  }, [status])

  if (status === 'connected') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-secondary-200">
        <span className="h-2.5 w-2.5 rounded-full bg-success-500" aria-hidden="true" />
        <span className="text-xs font-medium text-secondary-600">Conectado</span>
      </div>
    )
  }

  if (showDisconnected) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-danger-50 px-4 py-3 text-center border-t border-danger-200">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <span className="text-sm font-medium text-danger-700">
            Sem conexão. Não é possível avaliar.
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded bg-danger-600 px-3 py-1 text-sm font-medium text-white hover:bg-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    )
  }

  if (showReconnecting) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-warning-50 px-4 py-2 text-center border-t border-warning-200">
        <span className="text-sm font-medium text-warning-700">Reconectando...</span>
      </div>
    )
  }

  return null
}

export type { ConnectionStatusType }
