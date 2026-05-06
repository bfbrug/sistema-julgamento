import { Calendar, MapPin, Building2 } from 'lucide-react'
import { formatEventDate } from '@/lib/utils'

interface EventHeaderProps {
  name: string
  eventDate: string
  location: string
  organizer: string
  completedCount: number
  totalCount: number
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
    <footer
      className="flex items-center justify-between px-10 py-4"
      style={{
        borderTop: '1px solid #e8d89a',
        background: '#fdf6e3',
      }}
    >
      <div className="flex items-center gap-5" style={{ color: '#a08840' }}>
        <span className="text-base font-semibold" style={{ color: '#6b5a2d' }}>{name}</span>
        <span className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {formatEventDate(eventDate)}
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {location}
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          {organizer}
        </span>
      </div>

      <span className="text-sm font-medium tabular-nums" style={{ color: '#a08840' }}>
        {completedCount}/{totalCount} finalizados
      </span>
    </footer>
  )
}
