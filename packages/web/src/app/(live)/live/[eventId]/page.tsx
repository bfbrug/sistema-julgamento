'use client'

import { useParams } from 'next/navigation'
import { usePublicLivePanel } from '@/hooks/usePublicLivePanel'
import { EventHeader } from '@/components/live-panel/EventHeader'
import { CurrentParticipantHero } from '@/components/live-panel/CurrentParticipantHero'
import { JudgesProgress } from '@/components/live-panel/JudgesProgress'
import { UpcomingQueue } from '@/components/live-panel/UpcomingQueue'
import { EventFinishedView } from '@/components/live-panel/EventFinishedView'
import { ConnectionIndicator } from '@/components/live-panel/ConnectionIndicator'
import { formatEventDate } from '@/lib/utils'
import { usePublicResults } from '@/hooks/usePublicResults'
import { PublicResultsBoard } from '@/components/live/PublicResultsBoard'

export default function LivePanelPage() {
  const params = useParams()
  const eventId = typeof params['eventId'] === 'string' ? params['eventId'] : ''

  const { data: publicResults } = usePublicResults(eventId)

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
      <div
        className="flex h-screen flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 100%)' }}
      >
        <h1
          className="mb-4 text-4xl font-black"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#1a1208' }}
        >
          {error?.includes('404') || error?.includes('não encontrado')
            ? 'Evento não encontrado ou ainda não iniciou'
            : 'Erro ao carregar evento'}
        </h1>
        <p className="text-lg font-medium" style={{ color: '#8a7040' }}>
          {error ?? 'Verifique o link e tente novamente.'}
        </p>
      </div>
    )
  }

  if (status === 'DRAFT') {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 100%)' }}
      >
        <div className="mb-2 text-sm font-bold uppercase tracking-[0.25em]" style={{ color: '#c9a227' }}>
          Aguardando início
        </div>
        <h1
          className="mb-4 text-6xl font-black text-center"
          style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#1a1208', maxWidth: '900px' }}
        >
          {eventInfo.name}
        </h1>
        <div
          className="h-px w-48 mb-6"
          style={{ background: 'linear-gradient(to right, transparent, #c9a227, transparent)' }}
        />
        <div className="flex flex-col items-center gap-1 text-xl font-medium" style={{ color: '#6b5a2d' }}>
          <p>{formatEventDate(eventInfo.eventDate)}</p>
          <p>{eventInfo.location}</p>
          <p>{eventInfo.organizer}</p>
        </div>
        <div className="absolute bottom-6 right-6">
          <ConnectionIndicator status={connectionStatus} />
        </div>
      </div>
    )
  }

  if (status === 'FINISHED') {
    return (
      <PublicResultsBoard
        eventName={eventInfo?.name ?? ''}
        categories={publicResults?.categories ?? []}
      />
    )
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ cursor: 'none', background: '#fffdf5' }}
    >
      {currentParticipant ? (
        <>
          <CurrentParticipantHero
            name={currentParticipant.name}
            photoPath={currentParticipant.photoPath}
            presentationOrder={currentParticipant.presentationOrder}
            totalParticipants={totalCount}
            currentState={currentParticipant.currentState}
          />
          <div className="grid grid-cols-2" style={{ borderTop: '1px solid #e8d89a' }}>
            <JudgesProgress
              finished={judgesProgress.finished}
              total={judgesProgress.total}
            />
            <UpcomingQueue participants={upcomingParticipants} />
          </div>
        </>
      ) : (
        <div
          className="flex flex-1 flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #fffdf5 0%, #fef9e7 100%)' }}
        >
          <div className="mb-3 text-sm font-bold uppercase tracking-[0.25em]" style={{ color: '#c9a227' }}>
            Em breve
          </div>
          <h2
            className="text-6xl font-black"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", color: '#1a1208' }}
          >
            Aguardando próximo participante
          </h2>
          <div
            className="mt-4 h-px w-48"
            style={{ background: 'linear-gradient(to right, transparent, #c9a227, transparent)' }}
          />
          <p className="mt-4 text-2xl font-semibold" style={{ color: '#8a7040' }}>
            {completedCount} de {totalCount} finalizados
          </p>
        </div>
      )}

      <EventHeader
        name={eventInfo.name}
        eventDate={eventInfo.eventDate}
        location={eventInfo.location}
        organizer={eventInfo.organizer}
        completedCount={completedCount}
        totalCount={totalCount}
      />

      <div className="absolute bottom-14 right-6">
        <ConnectionIndicator status={connectionStatus} />
      </div>
    </div>
  )
}
