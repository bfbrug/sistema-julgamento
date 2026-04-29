import { Inbox } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-secondary-200 bg-white p-12 text-center">
      <Inbox className="h-12 w-12 text-secondary-300 mb-4" />
      <p className="text-secondary-500 mb-6">{message}</p>
      {action}
    </div>
  )
}
