'use client'

import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

interface ScoreItem {
  categoryName: string
  value: number
}

interface ReviewSummaryProps {
  scores: ScoreItem[]
  onEdit: () => void
  onFinalize: () => void
  isSubmitting?: boolean
}

export function ReviewSummary({ scores, onEdit, onFinalize, isSubmitting }: ReviewSummaryProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <h2 className="mb-2 text-center text-2xl font-semibold text-secondary-900">
          Confira suas notas antes de finalizar
        </h2>

        <div className="mt-6 rounded-lg border border-secondary-200 bg-white p-6 shadow-sm">
          <ul className="space-y-3">
            {scores.map((s) => (
              <li key={s.categoryName} className="flex items-center justify-between border-b border-secondary-100 pb-3 last:border-0 last:pb-0">
                <span className="text-secondary-700">{s.categoryName}</span>
                <span className="text-lg font-bold text-secondary-900">{s.value.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-md bg-warning-50 p-3 text-sm text-warning-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Após confirmar, as notas não poderão ser alteradas.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onEdit} disabled={isSubmitting}>
            Alterar
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={onFinalize} loading={isSubmitting} disabled={isSubmitting}>
            Confirmar e finalizar
          </Button>
        </div>
      </div>
    </div>
  )
}
