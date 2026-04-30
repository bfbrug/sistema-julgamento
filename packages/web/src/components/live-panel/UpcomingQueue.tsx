interface UpcomingQueueProps {
  participants: Array<{ name: string; presentationOrder: number }>
}

export function UpcomingQueue({ participants }: UpcomingQueueProps) {
  return (
    <div className="flex flex-col gap-4 bg-neutral-950 px-8 py-6">
      <h3 className="text-lg font-semibold uppercase tracking-wider text-neutral-400">
        Próximos
      </h3>
      {participants.length === 0 ? (
        <p className="text-base text-neutral-500">Fila encerrada</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {participants.map((p) => (
            <li
              key={p.presentationOrder}
              className="flex items-center gap-3 text-xl text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-sm font-bold text-neutral-400">
                {p.presentationOrder}
              </span>
              <span className="truncate">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
