'use client'

import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EventEndedStateProps {
  eventName: string
  totalEvaluated: number
}

export function EventEndedState({ eventName, totalEvaluated }: EventEndedStateProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
        <svg
          className="h-8 w-8 text-success-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-secondary-900">
        Evento encerrado. Obrigado pela sua participação!
      </h2>
      <p className="mb-2 text-secondary-500">
        {eventName}
      </p>
      <p className="mb-8 text-secondary-600">
        Você avaliou <strong>{totalEvaluated}</strong> participante{totalEvaluated !== 1 ? 's' : ''}.
      </p>
      <Button
        variant="primary"
        size="lg"
        onClick={() => router.push('/auth/login')}
        className="min-w-[200px]"
      >
        <LogOut className="h-5 w-5" />
        Sair
      </Button>
    </div>
  )
}
