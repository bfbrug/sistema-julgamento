'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { useJudgePanel } from '@/hooks/useJudgePanel'
import { WaitingState } from '@/components/judge/WaitingState'
import { PreviewState } from '@/components/judge/PreviewState'
import { ScoringForm } from '@/components/judge/ScoringForm'
import { ReviewSummary } from '@/components/judge/ReviewSummary'
import { FinishedState } from '@/components/judge/FinishedState'
import { EventEndedState } from '@/components/judge/EventEndedState'
import { ConnectionStatus } from '@/components/judge/ConnectionStatus'

export default function JudgePage() {
  const params = useParams()
  const eventId = typeof params['eventId'] === 'string' ? params['eventId'] : ''

  const {
    currentState,
    currentParticipant,
    eventInfo,
    judgeCategories,
    currentScores,
    connectionStatus,
    isSubmitting,
    totalEvaluated,
    openScoringForm,
    submitScores,
    editScores,
    finalizeScores,
    retryConnection,
  } = useJudgePanel(eventId)

  useEffect(() => {
    if (currentState === 'PREVIEW' && currentParticipant?.mySessionStatus === 'IN_SCORING') {
      openScoringForm()
    }
  }, [currentState, currentParticipant?.mySessionStatus, openScoringForm])

  if (currentState === 'CONNECTING') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (currentState === 'EVENT_ENDED') {
    return (
      <EventEndedState
        eventName={eventInfo?.name ?? 'Evento'}
        totalEvaluated={totalEvaluated}
      />
    )
  }

  const totalParticipants = eventInfo?.totalParticipants ?? 0

  return (
    <div className="relative">
      <ConnectionStatus status={connectionStatus} onRetry={retryConnection} />

      {currentState === 'WAITING' && (
        <WaitingState connectionStatus={connectionStatus} onRetryConnection={retryConnection} />
      )}

      {currentState === 'PREVIEW' && currentParticipant && eventInfo && (
        <PreviewState
          participantName={currentParticipant.name}
          photoUrl={currentParticipant.photoUrl}
          presentationOrder={currentParticipant.presentationOrder}
          totalParticipants={totalParticipants}
          categories={judgeCategories}
          canStartScoring={currentParticipant.mySessionStatus === 'IN_SCORING'}
          onStartScoring={openScoringForm}
        />
      )}

      {currentState === 'SCORING' && currentParticipant && eventInfo && (
        <ScoringForm
          participantName={currentParticipant.name}
          photoUrl={currentParticipant.photoUrl}
          presentationOrder={currentParticipant.presentationOrder}
          totalParticipants={totalParticipants}
          categories={judgeCategories}
          scoreMin={eventInfo.scoreMin}
          scoreMax={eventInfo.scoreMax}
          initialValues={currentScores}
          onSubmit={submitScores}
          onCancel={() => window.location.reload()}
          isSubmitting={isSubmitting}
          draftKey={`draft:scoring:${currentParticipant.id}`}
        />
      )}

      {currentState === 'REVIEW' && currentParticipant && (
        <ReviewSummary
          scores={judgeCategories.map((cat) => ({
            categoryName: cat.name,
            value: currentScores?.[cat.id] ?? 0,
          }))}
          onEdit={editScores}
          onFinalize={finalizeScores}
          isSubmitting={isSubmitting}
        />
      )}

      {currentState === 'FINISHED' && (
        <FinishedState
          scores={judgeCategories.map((cat) => ({
            categoryName: cat.name,
            value: currentScores?.[cat.id] ?? 0,
          }))}
        />
      )}
    </div>
  )
}
