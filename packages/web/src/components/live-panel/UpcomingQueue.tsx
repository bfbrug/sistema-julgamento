interface UpcomingQueueProps {
  participants: Array<{ name: string; presentationOrder: number }>
}

export function UpcomingQueue({ participants }: UpcomingQueueProps) {
  return (
    <div
      className="flex flex-col gap-4 px-8 py-6"
      style={{ background: '#fffdf5' }}
    >
      <h3
        className="text-sm font-bold uppercase tracking-[0.2em]"
        style={{ color: '#c9a227' }}
      >
        Próximos
      </h3>

      {participants.length === 0 ? (
        <p className="text-base font-medium" style={{ color: '#8a7040' }}>
          Fila encerrada
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {participants.map((p) => (
            <li
              key={p.presentationOrder}
              className="flex items-center gap-3"
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black"
                style={{
                  background: 'linear-gradient(135deg, #c9a227, #f0d060)',
                  color: '#1a1208',
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                }}
              >
                {p.presentationOrder}
              </span>
              <span
                className="truncate text-xl font-semibold"
                style={{
                  color: '#2d2010',
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                }}
              >
                {p.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
