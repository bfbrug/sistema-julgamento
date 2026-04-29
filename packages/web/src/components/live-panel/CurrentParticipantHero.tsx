import { User, Activity } from 'lucide-react'
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
    case 'PREVIEW':
      return 'Pré-visualização'
    case 'SCORING':
      return 'Em avaliação'
    case 'REVIEW':
      return 'Em revisão'
    case 'FINISHED':
      return 'Finalizado'
    case 'ABSENT':
      return 'Ausente'
    default:
      return state
  }
}

function stateColor(state: string): string {
  switch (state) {
    case 'PREVIEW':
      return 'text-amber-400'
    case 'SCORING':
      return 'text-emerald-400'
    case 'REVIEW':
      return 'text-sky-400'
    case 'FINISHED':
      return 'text-neutral-400'
    case 'ABSENT':
      return 'text-red-400'
    default:
      return 'text-neutral-400'
  }
}

export function CurrentParticipantHero({
  name,
  photoPath,
  presentationOrder,
  totalParticipants,
  currentState,
}: CurrentParticipantHeroProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center bg-neutral-950 px-8 py-10">
      <div className="flex items-center gap-12">
        <div className="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-2xl bg-neutral-800">
          {photoPath ? (
            <Image
              src={photoPath}
              alt={`Foto de ${name}`}
              fill
              className="object-cover"
              sizes="256px"
              priority
            />
          ) : (
            <User className="h-32 w-32 text-neutral-600" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-lg font-medium uppercase tracking-widest text-neutral-500">
            Participante {presentationOrder} de {totalParticipants}
          </p>
          <h2 className="text-7xl font-extrabold tracking-tight text-white">{name}</h2>
          <div className={`flex items-center gap-2 text-2xl font-semibold ${stateColor(currentState)}`}>
            <Activity className="h-6 w-6" aria-hidden="true" />
            <span>{stateLabel(currentState)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
