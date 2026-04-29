'use client'

import { useParams } from 'next/navigation'
import { usePublicLivePanel } from '@/hooks/usePublicLivePanel'
import { EventHeader } from '@/components/live-panel/EventHeader'
import { CurrentParticipantHero } from '@/components/live-panel/CurrentParticipantHero'
import { JudgesProgress } from '@/components/live-panel/JudgesProgress'
import { UpcomingQueue } from '@/components/live-panel/UpcomingQueue'
import { EventFinishedView } from '@/components/live-panel/EventFinishedView'
import { ConnectionIndicator } from '@/components/live-panel/ConnectionIndicator'

export default function LivePanelPage() {
  const params = useParams()
  const eventId = typeof params['eventId'] === 'string' ? params['eventId'] : ''

  const {
    eventInfo,
    currentParticipant,
    judgesProgress,
    completedCount,
    totalCount,
    upcomingParticipants,
    status,
    finalResults,
    connectionStatus,
    error,
  } = usePublicLivePanel(eventId)

  if (error || !eventInfo) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 text-white">
        <h1 className="mb-4 text-4xl font-bold">
          {error?.includes('404') || error?.includes('não encontrado')
            ? 'Evento não encontrado ou ainda não iniciou'
            : 'Erro ao carregar evento'}
        </h1>
        <p className="text-lg text-neutral-400">
          {error ?? 'Verifique o link e tente novamente.'}
        </p>
      </div>
    )
  }

  if (status === 'DRAFT' || status === 'REGISTERING') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 text-white">
        <h1 className="mb-4 text-5xl font-bold">{eventInfo.name}</h1>
        <p className="mb-2 text-2xl text-neutral-400">
          Evento configurado, aguardando início do julgamento
        </p>
        <div className="mt-6 text-lg text-neutral-500">
          <p>{new Date(eventInfo.eventDate).toLocaleDateString('pt-BR')}</p>
          <p>{eventInfo.location}</p>
          <p>{eventInfo.organizer}</p>
        </div>
        <div className="absolute bottom-6 right-6">
          <ConnectionIndicator status={connectionStatus} />
        </div>
      </div>
    )
  }

  if (status === 'FINISHED' && finalResults) {
    return (
      <div className="flex h-screen flex-col bg-neutral-950" style={{ cursor: 'none' }}>
        <EventHeader
          name={eventInfo.name}
          eventDate={eventInfo.eventDate}
          location={eventInfo.location}
          organizer={eventInfo.organizer}
          completedCount={completedCount}
          totalCount={totalCount}
        />
        <EventFinishedView eventName={eventInfo.name} ranking={finalResults} />
        <div className="absolute bottom-6 right-6">
          <ConnectionIndicator status={connectionStatus} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-neutral-950"
      style={{ cursor: 'none' }}
    >
      <EventHeader
        name={eventInfo.name}
        eventDate={eventInfo.eventDate}
        location={eventInfo.location}
        organizer={eventInfo.organizer}
        completedCount={completedCount}
        totalCount={totalCount}
      />

      {currentParticipant ? (
        <>
          <CurrentParticipantHero
            name={currentParticipant.name}
            photoPath={currentParticipant.photoPath}
            presentationOrder={currentParticipant.presentationOrder}
            totalParticipants={totalCount}
            currentState={currentParticipant.currentState}
          />
          <div className="grid grid-cols-2 border-t border-neutral-800">
            <JudgesProgress
              finished={judgesProgress.finished}
              total={judgesProgress.total}
            />
            <UpcomingQueue participants={upcomingParticipants} />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <h2 className="text-5xl font-bold text-white">
            Aguardando próximo participante
          </h2>
          <p className="mt-4 text-2xl text-neutral-500">
            {completedCount} de {totalCount} finalizados
          </p>
        </div>
      )}

      <div className="absolute bottom-6 right-6">
        <ConnectionIndicator status={connectionStatus} />
      </div>
    </div>
  )
}
