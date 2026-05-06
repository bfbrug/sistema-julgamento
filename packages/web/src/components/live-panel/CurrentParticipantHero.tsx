import { User } from 'lucide-react'
import Image from 'next/image'

interface CurrentParticipantHeroProps {
  name: string
  photoPath: string | null
  presentationOrder: number
  totalParticipants: number
  currentState: string
}

function stateLabel(state: string): string {
  switch (state) {
    case 'PREVIEW': return 'Pré-visualização'
    case 'SCORING': return 'Em avaliação'
    case 'REVIEW': return 'Em revisão'
    case 'FINISHED': return 'Finalizado'
    case 'ABSENT': return 'Ausente'
    default: return state
  }
}

function stateStyle(state: string): { color: string; bg: string; dot: string } {
  switch (state) {
    case 'PREVIEW': return { color: '#92660a', bg: '#fef3c7', dot: '#f59e0b' }
    case 'SCORING': return { color: '#166534', bg: '#dcfce7', dot: '#22c55e' }
    case 'REVIEW':  return { color: '#1e40af', bg: '#dbeafe', dot: '#3b82f6' }
    case 'FINISHED': return { color: '#57534e', bg: '#f5f5f4', dot: '#a8a29e' }
    case 'ABSENT':  return { color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' }
    default:        return { color: '#57534e', bg: '#f5f5f4', dot: '#a8a29e' }
  }
}

export function CurrentParticipantHero({
  name,
  photoPath,
  presentationOrder,
  totalParticipants,
  currentState,
}: CurrentParticipantHeroProps) {
  const style = stateStyle(currentState)

  return (
    <section
      className="flex flex-1 flex-col items-center justify-center px-8 py-10"
      style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 50%, #fdf6e3 100%)' }}
    >
      <div className="flex items-center gap-16">
        {/* Foto com moldura dourada */}
        <div
          className="relative flex-shrink-0"
          style={{
            padding: '6px',
            background: 'linear-gradient(135deg, #c9a227, #f0d060, #c9a227)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(201,162,39,0.3), 0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              width: '280px',
              height: '280px',
              borderRadius: '14px',
              background: '#f5efd8',
            }}
          >
            {photoPath ? (
              <Image
                src={photoPath.startsWith('http') || photoPath.startsWith('/') ? photoPath : `/uploads/${photoPath}`}
                alt={`Foto de ${name}`}
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-32 w-32" style={{ color: '#c9a227' }} aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <p
            className="text-base font-bold uppercase tracking-[0.25em]"
            style={{ color: '#c9a227' }}
          >
            Participante {presentationOrder} de {totalParticipants}
          </p>

          <h2
            className="font-black leading-none"
            style={{
              fontFamily: "'DM Sans', 'Inter', sans-serif",
              fontSize: 'clamp(3rem, 6vw, 5.5rem)',
              color: '#1a1208',
              maxWidth: '700px',
            }}
          >
            {name}
          </h2>

          {/* Badge de estado */}
          <div
            className="inline-flex w-fit items-center gap-2.5 rounded-full px-5 py-2.5"
            style={{ background: style.bg }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: style.dot }}
            />
            <span
              className="text-xl font-bold"
              style={{ color: style.color }}
            >
              {stateLabel(currentState)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
