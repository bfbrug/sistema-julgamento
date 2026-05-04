'use client'

import { useParams } from 'next/navigation'
import { useLiveScoring } from '@/hooks/useLiveScoring'
import { useTransitionEvent } from '@/hooks/useEvents'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Users, Trophy, Play, CheckCircle, AlertCircle, Clock, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'NOT_STARTED': 'NÃO INICIADO',
    'IN_SCORING': 'AVALIANDO',
    'IN_REVIEW': 'EM REVISÃO',
    'FINISHED': 'FINALIZADO',
    'WAITING': 'AGUARDANDO',
    'PREVIEW': 'PREPARAÇÃO',
    'SCORING': 'APRESENTAÇÃO',
    'ABSENT': 'AUSENTE',
  }
  return map[status] || status.toUpperCase()
}

export default function EventLivePage() {
  const router = useRouter()
  const { id: eventId } = useParams() as { id: string }
  const { liveState, isConnected, activateParticipant, startScoring, markAbsent } = useLiveScoring(eventId)
  const { mutate: transitionEvent } = useTransitionEvent(eventId)

  if (!liveState) return <div className="p-12 text-center">Iniciando conexão...</div>

  const { currentParticipant, queue, judges } = liveState
  const nextInQueue = queue.find((p) => p.status === 'WAITING')
  const allFinished = queue.length > 0 && queue.every((p) => p.status === 'FINISHED' || p.status === 'ABSENT')

  const handleFinishEvent = () => {
    transitionEvent({ targetStatus: 'FINISHED' }, {
      onSuccess: () => {
        router.push(`/events/${eventId}/reports`)
      },
    })
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Conectividade */}
      {!isConnected && (
        <div className="bg-warning-50 border border-warning-200 text-warning-800 px-4 py-2 rounded flex items-center gap-2 animate-pulse">
          <Clock className="h-4 w-4" />
          Conexão perdida. Tentando reconectar...
        </div>
      )}

      {allFinished && (
        <div className="bg-success-50 border border-success-200 text-success-800 px-4 py-3 rounded flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="h-5 w-5" />
            Todos os participantes foram avaliados.
          </div>
          <Button onClick={handleFinishEvent} className="bg-success-600 hover:bg-success-700">
            <Flag className="mr-2 h-4 w-4" />
            Finalizar Evento
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Participante Atual */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            header={<h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary-600" /> Em Destaque</h2>}
            body={
              currentParticipant ? (
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="h-48 w-48 rounded-xl bg-secondary-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {currentParticipant.photoUrl ? (
                      <img src={currentParticipant.photoUrl} alt={currentParticipant.name} className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-16 w-16 text-secondary-300" />
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <span className="inline-block px-2 py-1 rounded bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-wider mb-2">
                        {translateStatus(currentParticipant.status)}
                      </span>
                      <h3 className="text-4xl font-black text-secondary-900 leading-tight">
                        {currentParticipant.name}
                      </h3>
                      <p className="text-secondary-500 font-medium">Posição na fila: {currentParticipant.presentationOrder}</p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      {(currentParticipant.status === 'WAITING' || currentParticipant.status === 'NOT_STARTED') && (
                        <Button size="lg" className="px-8" onClick={() => activateParticipant(currentParticipant.id)}>
                          <Play className="mr-2 h-5 w-5" />
                          Ativar Agora
                        </Button>
                      )}
                      {(currentParticipant.status === 'PREVIEW' || currentParticipant.status === 'IN_PREVIEW') && (
                        <Button size="lg" className="px-8 bg-primary-600 hover:bg-primary-700" onClick={() => startScoring(currentParticipant.id)}>
                          <Play className="mr-2 h-5 w-5" />
                          Iniciar Apresentação
                        </Button>
                      )}
                      {(currentParticipant.status === 'SCORING' || currentParticipant.status === 'IN_SCORING') && (
                        <div className="flex items-center gap-2 text-warning-600 font-bold">
                          <Clock className="h-5 w-5 animate-spin" />
                          Jurados avaliando...
                        </div>
                      )}
                      {currentParticipant.status === 'FINISHED' && nextInQueue && (
                        <Button size="lg" variant="secondary" className="px-8" onClick={() => activateParticipant(nextInQueue.id)}>
                          Próximo Participante
                        </Button>
                      )}
                      {(currentParticipant.status === 'WAITING' || currentParticipant.status === 'NOT_STARTED') && (
                        <Button size="lg" variant="ghost" className="text-danger-600" onClick={() => markAbsent(currentParticipant.id)}>
                          Marcar Ausente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="mx-auto h-16 w-16 bg-secondary-50 rounded-full flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-secondary-300" />
                  </div>
                  <p className="text-secondary-500">Nenhum participante ativo no momento.</p>
                  {nextInQueue && (
                    <Button onClick={() => activateParticipant(nextInQueue.id)}>
                      Ativar Primeiro Participante
                    </Button>
                  )}
                </div>
              )
            }
          />

          {/* Grid de Jurados */}
          <div className="space-y-4">
            <h3 className="font-bold text-secondary-900 flex items-center gap-2">
              <Users className="h-5 w-5" /> Status dos Jurados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {judges.map((judge) => (
                <Card
                  key={judge.id}
                  className={cn(
                    'border-l-4 transition-all',
                    judge.status === 'FINISHED' ? 'border-l-success-500' :
                    judge.status === 'SCORING' ? 'border-l-warning-500 animate-pulse' :
                    'border-l-secondary-300'
                  )}
                  body={
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-secondary-900">{judge.name}</span>
                        {judge.status === 'FINISHED' ? (
                          <CheckCircle className="h-4 w-4 text-success-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                        )}
                      </div>
                      <div className="text-xs text-secondary-500 font-medium uppercase">{translateStatus(judge.status)}</div>
                      
                      <div className="w-full bg-secondary-100 h-1.5 rounded-full mt-1">
                        <div 
                          className="bg-primary-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(judge.progress || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lado Direito: Fila */}
        <div className="space-y-4">
          <h3 className="font-bold text-secondary-900 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Fila de Espera
          </h3>
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {queue.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all',
                  p.id === currentParticipant?.id ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-100' : 'bg-white border-secondary-100'
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs',
                  p.status === 'FINISHED' ? 'bg-success-100 text-success-700' :
                  p.status === 'SCORING' ? 'bg-warning-100 text-warning-700' :
                  p.id === currentParticipant?.id ? 'bg-primary-600 text-white' :
                  'bg-secondary-100 text-secondary-500'
                )}>
                  {p.presentationOrder}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold truncate', p.id === currentParticipant?.id ? 'text-primary-900' : 'text-secondary-700')}>
                    {p.name}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-secondary-400">{translateStatus(p.status)}</p>
                </div>
                {p.status === 'FINISHED' && <CheckCircle className="h-4 w-4 text-success-500" />}
                {p.status === 'ABSENT' && <AlertCircle className="h-4 w-4 text-danger-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
