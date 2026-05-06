interface JudgesProgressProps {
  finished: number
  total: number
}

export function JudgesProgress({ finished, total }: JudgesProgressProps) {
  const percentage = total > 0 ? Math.round((finished / total) * 100) : 0

  return (
    <div
      className="flex flex-col gap-4 px-8 py-6"
      style={{
        background: '#ffffff',
        borderRight: '1px solid #e8d89a',
      }}
    >
      <h3
        className="text-sm font-bold uppercase tracking-[0.2em]"
        style={{ color: '#c9a227' }}
      >
        Progresso dos Jurados
      </h3>

      <div className="flex items-end gap-3">
        <span
          className="text-7xl font-black tabular-nums leading-none"
          style={{
            fontFamily: "'DM Sans', 'Inter', sans-serif",
            color: '#1a1208',
          }}
        >
          {finished}
        </span>
        <span
          className="mb-2 text-2xl font-medium"
          style={{ color: '#8a7040' }}
        >
          de {total} jurados
        </span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: '#f5efd8' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(to right, #c9a227, #f0d060)',
          }}
          aria-hidden="true"
        />
      </div>

      <p className="text-base font-semibold" style={{ color: '#6b5a2d' }}>
        {percentage}% concluído
      </p>
    </div>
  )
}
