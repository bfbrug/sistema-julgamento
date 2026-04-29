'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { User } from 'lucide-react'
import { useState } from 'react'

interface CategoryPreview {
  id: string
  name: string
}

interface PreviewStateProps {
  participantName: string
  photoUrl: string | null
  presentationOrder: number
  totalParticipants: number
  categories: CategoryPreview[]
  canStartScoring: boolean
  onStartScoring: () => void
}

export function PreviewState({
  participantName,
  photoUrl,
  presentationOrder,
  totalParticipants,
  categories,
  canStartScoring,
  onStartScoring,
}: PreviewStateProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <Card
        className="w-full max-w-md"
        header={
          <div className="text-center">
            <span className="text-sm font-medium text-secondary-500">
              Participante {presentationOrder} de {totalParticipants}
            </span>
          </div>
        }
        body={
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-secondary-100">
              {photoUrl && !imageError ? (
                <img
                  src={photoUrl}
                  alt={`Foto de ${participantName}`}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <User className="h-16 w-16 text-secondary-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-secondary-900">{participantName}</h2>

            <div className="w-full">
              <p className="mb-2 text-sm font-medium text-secondary-600">Categorias a avaliar:</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canStartScoring}
              onClick={onStartScoring}
            >
              {canStartScoring ? 'Avaliar participante' : 'Aguardando início da avaliação'}
            </Button>
          </div>
        }
      />
    </div>
  )
}
