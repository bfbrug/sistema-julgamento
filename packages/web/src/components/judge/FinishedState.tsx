'use client'

interface ScoreSummary {
  categoryName: string
  value: number
}

interface FinishedStateProps {
  scores: ScoreSummary[]
}

export function FinishedState({ scores }: FinishedStateProps) {
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
        Notas finalizadas com sucesso
      </h2>
      <p className="mb-8 text-secondary-500">
        Aguardando o gestor ativar o próximo participante
      </p>

      {scores.length > 0 && (
        <div className="w-full max-w-sm rounded-lg border border-secondary-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary-500">
            Últimas notas registradas
          </h3>
          <ul className="space-y-2">
            {scores.map((s) => (
              <li key={s.categoryName} className="flex items-center justify-between text-sm">
                <span className="text-secondary-700">{s.categoryName}</span>
                <span className="font-semibold text-secondary-900">{s.value.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
