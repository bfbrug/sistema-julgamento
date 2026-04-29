import { Calendar, MapPin, Building2 } from 'lucide-react'

interface EventHeaderProps {
  name: string
  eventDate: string
  location: string
  organizer: string
  completedCount: number
  totalCount: number
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function EventHeader({
  name,
  eventDate,
  location,
  organizer,
  completedCount,
  totalCount,
}: EventHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-8 py-5">
      <div className="flex items-center gap-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">{name}</h1>
        <div className="flex items-center gap-4 text-base text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {formatDate(eventDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {location}
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {organizer}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-2xl font-semibold text-white">
          {completedCount}
        </span>
        <span className="text-lg text-neutral-500"> de </span>
        <span className="text-2xl font-semibold text-white">{totalCount}</span>
        <span className="ml-2 text-sm uppercase tracking-wider text-neutral-500">
          finalizados
        </span>
      </div>
    </header>
  )
}
