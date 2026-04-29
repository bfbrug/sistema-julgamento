interface JudgesProgressProps {
  finished: number
  total: number
}

export function JudgesProgress({ finished, total }: JudgesProgressProps) {
  const percentage = total > 0 ? Math.round((finished / total) * 100) : 0

  return (
    <div className="flex flex-col gap-4 bg-neutral-950 px-8 py-6">
      <h3 className="text-lg font-semibold uppercase tracking-wider text-neutral-400">
        Progresso dos Jurados
      </h3>
      <div className="flex items-end gap-3">
        <span className="text-6xl font-bold text-white">{finished}</span>
        <span className="mb-2 text-2xl text-neutral-500">de {total}</span>
      </div>
      <p className="text-base text-neutral-400">jurados finalizaram</p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
