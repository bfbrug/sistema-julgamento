'use client'

import { useParams } from 'next/navigation'
import { useLiveScoring } from '@/hooks/useLiveScoring'
import { useTransitionEvent } from '@/hooks/useEvents'
import { Button } from '@/components/ui/Button'
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
  return map[status] || (status ? status.toUpperCase() : '')
}

export default function EventLivePage() {
  const router = useRouter()
  const { id: eventId } = useParams() as { id: string }
  const { liveState, isConnected, activateParticipant, markAbsent } = useLiveScoring(eventId)
  const { mutate: transitionEvent } = useTransitionEvent(eventId)

  if (!liveState) return <div className="p-12 text-center">Iniciando conexão...</div>

  const { currentParticipant, queue, judges: rawJudges } = liveState
  const nextInQueue = queue.find((p) => p.status === 'WAITING')
  const judges = currentParticipant ? rawJudges : rawJudges.map((j) => ({ ...j, status: 'NOT_STARTED', progress: 0 }))
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* ── EM DESTAQUE ── */}
          {(() => {
            const subject = currentParticipant ?? (nextInQueue ? { ...nextInQueue, status: 'NEXT' } : null)
            const isNext = !currentParticipant && !!nextInQueue
            const isScoring = subject && (subject.status === 'SCORING' || subject.status === 'IN_SCORING')
            const isPreview = subject && (subject.status === 'PREVIEW' || subject.status === 'IN_PREVIEW')
            const isFinished = subject?.status === 'FINISHED'

            return (
              <div className="rounded-xl border border-secondary-200 bg-white shadow-sm overflow-hidden">
                {/* topo */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-secondary-100 bg-secondary-50/50">
                  <div className="flex items-center gap-1.5 text-secondary-500">
                    <Trophy className="h-3.5 w-3.5 text-primary-500" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Em Destaque</span>
                  </div>
                  {subject && (
                    <span className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                      isScoring ? 'bg-amber-100 text-amber-700' :
                      isPreview ? 'bg-primary-100 text-primary-700' :
                      isFinished ? 'bg-emerald-100 text-emerald-700' :
                      isNext ? 'bg-secondary-100 text-secondary-600' :
                      'bg-secondary-100 text-secondary-600'
                    )}>
                      {isScoring && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      {isNext ? 'Próximo' : translateStatus(subject.status)}
                    </span>
                  )}
                </div>

                {subject ? (
                  <div className="flex items-center gap-5 p-4">
                    {/* Foto quadrada fixa */}
                    <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-secondary-100 border border-secondary-200">
                      {subject.photoUrl
                        ? <img src={subject.photoUrl} alt={subject.name} className="h-full w-full object-cover object-top" />
                        : <div className="h-full w-full flex items-center justify-center"><Users className="h-8 w-8 text-secondary-300" /></div>
                      }
                    </div>

                    {/* Texto + ação */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-bold text-secondary-900 truncate leading-tight">{subject.name}</h3>
                        <span className="text-xs text-secondary-400 font-medium flex-shrink-0">#{subject.presentationOrder}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {(subject.status === 'WAITING' || subject.status === 'NOT_STARTED') && (<>
                          <Button size="sm" onClick={() => activateParticipant(subject.id)}>
                            <Play className="mr-1 h-3 w-3" /> Ativar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-danger-600 text-xs" onClick={() => markAbsent(subject.id)}>
                            Marcar Ausente
                          </Button>
                        </>)}
                        {isNext && (
                          <Button size="sm" onClick={() => activateParticipant(subject.id)}>
                            <Play className="mr-1 h-3 w-3" /> Ativar Participante
                          </Button>
                        )}
                        {isPreview && (
                          <span className="flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                            <Clock className="h-3.5 w-3.5 animate-spin" /> Iniciando avaliação...
                          </span>
                        )}
                        {isScoring && (
                          <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                            <Clock className="h-3.5 w-3.5 animate-spin" /> Jurados avaliando...
                          </span>
                        )}
                        {isFinished && nextInQueue && (
                          <Button size="sm" variant="secondary" onClick={() => activateParticipant(nextInQueue.id)}>
                            Próximo Participante
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-2 text-secondary-300">
                    <Trophy className="h-7 w-7" />
                    <p className="text-xs text-secondary-400">Nenhum participante ativo.</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── JURADOS ── */}
          <div className="rounded-xl border border-secondary-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-secondary-100 bg-secondary-50/50">
              <div className="flex items-center gap-1.5 text-secondary-500">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold uppercase tracking-widest">Jurados</span>
              </div>
              <span className="text-xs text-secondary-400 font-medium">
                {judges.filter(j => j.status === 'FINISHED').length}/{judges.length} finalizados
              </span>
            </div>
            <div className={cn(
              'grid gap-px bg-secondary-100',
              judges.length <= 3 ? 'grid-cols-3' :
              judges.length <= 4 ? 'grid-cols-4' :
              judges.length <= 6 ? 'grid-cols-3' :
              'grid-cols-4'
            )}>
              {judges.map((judge) => {
                const done = judge.status === 'FINISHED'
                const active = judge.status === 'IN_SCORING' || judge.status === 'SCORING'
                const review = judge.status === 'IN_REVIEW'
                return (
                  <div key={judge.id} className={cn(
                    'flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-white transition-colors',
                    done ? 'bg-emerald-50' : active ? 'bg-amber-50' : review ? 'bg-primary-50' : ''
                  )}>
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      done ? 'bg-emerald-100 text-emerald-700' :
                      active ? 'bg-amber-100 text-amber-700' :
                      review ? 'bg-primary-100 text-primary-700' :
                      'bg-secondary-100 text-secondary-500'
                    )}>
                      {judge.name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-secondary-800 text-center truncate w-full px-1 leading-tight">{judge.name}</p>
                    <div className="flex items-center gap-1">
                      {done
                        ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                        : active || review
                          ? <div className="h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                          : null
                      }
                      <p className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide',
                        done ? 'text-emerald-600' :
                        active ? 'text-amber-600' :
                        review ? 'text-primary-600' :
                        'text-secondary-400'
                      )}>{translateStatus(judge.status)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── FILA DE ESPERA ── */}
        <div className="rounded-xl border border-secondary-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-secondary-100 bg-secondary-50/50">
            <Clock className="h-3.5 w-3.5 text-secondary-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary-500">Fila de Espera</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-secondary-100" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {[...queue].sort((a, b) => {
              const done = (s: string) => s === 'FINISHED' || s === 'ABSENT'
              if (done(a.status) && !done(b.status)) return 1
              if (!done(a.status) && done(b.status)) return -1
              return a.presentationOrder - b.presentationOrder
            }).map((p) => {
              const isCurrent = p.id === currentParticipant?.id
              const done = p.status === 'FINISHED' || p.status === 'ABSENT'
              return (
                <div key={p.id} className={cn(
                  'flex items-center gap-3 px-4 py-2.5 transition-colors',
                  isCurrent ? 'bg-primary-50' : done ? 'opacity-50' : 'hover:bg-secondary-50'
                )}>
                  <div className="h-8 w-8 rounded-full flex-shrink-0 overflow-hidden border border-secondary-200 bg-secondary-100 flex items-center justify-center text-xs font-bold text-secondary-500">
                    {p.photoUrl
                      ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover object-top" />
                      : p.presentationOrder
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold truncate leading-tight', isCurrent ? 'text-primary-800' : done ? 'text-secondary-400' : 'text-secondary-800')}>{p.name}</p>
                    <p className={cn('text-[10px] font-medium uppercase tracking-wide', isCurrent ? 'text-primary-500' : done ? 'text-secondary-400' : 'text-secondary-400')}>{translateStatus(p.status)}</p>
                  </div>
                  {p.status === 'FINISHED' && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                  {p.status === 'ABSENT' && <AlertCircle className="h-3.5 w-3.5 text-danger-400 flex-shrink-0" />}
                  {isCurrent && !done && <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
