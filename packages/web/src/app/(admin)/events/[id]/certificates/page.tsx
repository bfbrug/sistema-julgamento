'use client'

import { useParams } from 'next/navigation'
import { CertificateTextEditor } from '@/components/admin/certificates/CertificateTextEditor'
import { BackgroundUploader } from '@/components/admin/certificates/BackgroundUploader'
import { SignatureManager } from '@/components/admin/certificates/SignatureManager'
import { BatchGenerationCard } from '@/components/admin/certificates/BatchGenerationCard'
import { useCertificateConfig } from '@/hooks/useCertificates'
import { useEvent } from '@/hooks/useEvents'
import { useParticipants } from '@/hooks/useParticipants'

export default function CertificatesPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: config, isLoading: isLoadingConfig } = useCertificateConfig(eventId)
  const { isLoading: isLoadingEvent } = useEvent(eventId)
  const { data: participants, isLoading: isLoadingParticipants } = useParticipants(eventId)

  const isLoading = isLoadingConfig || isLoadingEvent || isLoadingParticipants

  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
  const backgroundUrl = config?.backgroundPath ? `${baseUrl}/uploads/${config.backgroundPath}` : null

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-secondary-900">Certificados</h1>
        <p className="text-sm text-secondary-500 mt-1">
          Configure o layout, assinaturas e gere os certificados em PDF.
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary-100 rounded" />
          <div className="h-48 bg-secondary-100 rounded" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Linha 1: Texto + Background lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <section className="lg:col-span-3 rounded-xl border border-secondary-200 p-6">
              <h2 className="text-base font-semibold text-secondary-900 mb-4">Texto do certificado</h2>
              <CertificateTextEditor eventId={eventId} initialText={config?.certificateText ?? ''} />
            </section>

            <section className="lg:col-span-2 rounded-xl border border-secondary-200 p-6">
              <h2 className="text-base font-semibold text-secondary-900 mb-4">Imagem de fundo</h2>
              <BackgroundUploader
                eventId={eventId}
                backgroundPath={config?.backgroundPath ?? null}
                publicUrl={backgroundUrl}
              />
            </section>
          </div>

          {/* Linha 2: Assinaturas */}
          <section className="rounded-xl border border-secondary-200 p-6">
            <h2 className="text-base font-semibold text-secondary-900 mb-1">Assinaturas</h2>
            <p className="text-xs text-secondary-500 mb-4">Arraste os cards para reordenar.</p>
            <SignatureManager eventId={eventId} signatures={config?.signatures ?? []} />
          </section>

          {/* Linha 3: Geração em lote */}
          <section>
            <BatchGenerationCard
              eventId={eventId}
              config={config ?? null}
              participantCount={participants?.length ?? 0}
            />
          </section>
        </div>
      )}
    </>
  )
}
