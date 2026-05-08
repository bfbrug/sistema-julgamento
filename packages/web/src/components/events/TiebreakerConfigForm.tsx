'use client'

import { useMemo, useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useUpdateTiebreaker, useRemoveTiebreaker } from '@/hooks/useTiebreaker'
import type { TiebreakerConfig } from '@judging/shared'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  Scale,
  ArrowDown,
  Trophy,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  eventId: string
  tiebreaker: TiebreakerConfig | null
  eventStatus: string
}

export function TiebreakerConfigForm({ eventId, tiebreaker, eventStatus }: Props) {
  const { data: categories, isLoading: isLoadingCategories } = useCategories(eventId)
  const { mutate: updateTiebreaker, isPending: isUpdating } = useUpdateTiebreaker(eventId)
  const { mutate: removeTiebreaker, isPending: isRemoving } = useRemoveTiebreaker(eventId)

  const [firstCategoryId, setFirstCategoryId] = useState<string>('')
  const [secondCategoryId, setSecondCategoryId] = useState<string>('')
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const isFinished = eventStatus === 'FINISHED'

  useEffect(() => {
    if (tiebreaker) {
      setFirstCategoryId(tiebreaker.firstCategoryId ?? '')
      setSecondCategoryId(tiebreaker.secondCategoryId ?? '')
    } else {
      setFirstCategoryId('')
      setSecondCategoryId('')
    }
  }, [tiebreaker])

  const firstCategory = useMemo(
    () => categories?.find((c) => c.id === firstCategoryId),
    [categories, firstCategoryId]
  )
  const secondCategory = useMemo(
    () => categories?.find((c) => c.id === secondCategoryId),
    [categories, secondCategoryId]
  )

  const availableForSecond = useMemo(() => {
    if (!categories) return []
    return categories.filter((c) => c.id !== firstCategoryId)
  }, [categories, firstCategoryId])

  const hasChanges = useMemo(() => {
    const currentFirst = tiebreaker?.firstCategoryId ?? ''
    const currentSecond = tiebreaker?.secondCategoryId ?? ''
    return firstCategoryId !== currentFirst || secondCategoryId !== currentSecond
  }, [tiebreaker, firstCategoryId, secondCategoryId])

  const isValid = useMemo(() => {
    if (!firstCategoryId) return false
    if (secondCategoryId && secondCategoryId === firstCategoryId) return false
    return true
  }, [firstCategoryId, secondCategoryId])

  const handleSave = () => {
    if (!isValid) return
    const payload: { firstCategoryId?: string; secondCategoryId?: string } = {
      firstCategoryId: firstCategoryId || undefined,
    }
    if (secondCategoryId) {
      payload.secondCategoryId = secondCategoryId
    }
    updateTiebreaker(payload)
  }

  const handleClearSecond = () => {
    setSecondCategoryId('')
  }

  const handleReset = () => {
    setFirstCategoryId(tiebreaker?.firstCategoryId ?? '')
    setSecondCategoryId(tiebreaker?.secondCategoryId ?? '')
  }

  if (isLoadingCategories) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded bg-secondary-200" />
        <div className="h-48 rounded bg-secondary-100" />
      </div>
    )
  }

  const notEnoughCategories = (categories?.length ?? 0) < 2

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-8 py-10 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Scale className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Critérios de Desempate</h2>
            <p className="mt-1 max-w-lg text-primary-100">
              Defina a cascata de regras que o sistema usará para decidir a colocação quando houver empate na nota final.
            </p>
          </div>
        </div>
      </div>

      {notEnoughCategories ? (
        <Card
          body={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-50">
                <AlertCircle className="h-8 w-8 text-warning-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-secondary-900">Categorias insuficientes</h3>
              <p className="mt-1 max-w-sm text-secondary-500">
                Você precisa de pelo menos 2 categorias cadastradas para configurar critérios de desempate.
              </p>
            </div>
          }
        />
      ) : (
        <>
          {/* Cascade visualization */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary-500">
              <Sparkles className="h-4 w-4" />
              <span>Sequência de aplicação</span>
            </div>

            {/* Step 1 */}
            <div
              className={cn(
                'group relative overflow-hidden rounded-xl border-2 bg-white p-6 transition-all duration-300',
                firstCategoryId
                  ? 'border-primary-200 shadow-md'
                  : 'border-dashed border-secondary-200 shadow-sm'
              )}
            >
              {firstCategoryId && (
                <div className="absolute inset-y-0 left-0 w-1 bg-primary-500" />
              )}
              <div className="flex items-start gap-5">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-colors',
                    firstCategoryId
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-secondary-100 text-secondary-400'
                  )}
                >
                  1
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-secondary-900">1º Critério de Desempate</h3>
                    <p className="text-sm text-secondary-500">
                      Participante com maior nota nesta categoria leva vantagem.
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      id="first-criterion"
                      value={firstCategoryId}
                      onChange={(e) => {
                        setFirstCategoryId(e.target.value)
                        if (secondCategoryId === e.target.value) {
                          setSecondCategoryId('')
                        }
                      }}
                      disabled={isFinished}
                      className={cn(
                        'block w-full appearance-none rounded-lg border px-4 py-3 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-secondary-50',
                        firstCategoryId
                          ? 'border-primary-300 bg-primary-50/50 text-primary-900'
                          : 'border-secondary-200 bg-white text-secondary-700'
                      )}
                    >
                      <option value="">Selecione uma categoria...</option>
                      {categories?.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                      <ArrowDown className="h-4 w-4 text-secondary-400" />
                    </div>
                  </div>
                  {firstCategory && (
                    <div className="flex items-center gap-2 text-sm text-primary-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        <strong>{firstCategory.name}</strong> definida como 1º critério
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-100">
                <ArrowDown className="h-4 w-4 text-secondary-400" />
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={cn(
                'group relative overflow-hidden rounded-xl border-2 bg-white p-6 transition-all duration-300',
                secondCategoryId
                  ? 'border-primary-200 shadow-md'
                  : 'border-dashed border-secondary-200 shadow-sm'
              )}
            >
              {secondCategoryId && (
                <div className="absolute inset-y-0 left-0 w-1 bg-primary-500" />
              )}
              <div className="flex items-start gap-5">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-colors',
                    secondCategoryId
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-secondary-100 text-secondary-400'
                  )}
                >
                  2
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-secondary-900">2º Critério de Desempate</h3>
                    <p className="text-sm text-secondary-500">
                      Se o empate persistir após o 1º critério, a nota nesta categoria decide.
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      id="second-criterion"
                      value={secondCategoryId}
                      onChange={(e) => setSecondCategoryId(e.target.value)}
                      disabled={!firstCategoryId || isFinished}
                      className={cn(
                        'block w-full appearance-none rounded-lg border px-4 py-3 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-secondary-50',
                        secondCategoryId
                          ? 'border-primary-300 bg-primary-50/50 text-primary-900'
                          : 'border-secondary-200 bg-white text-secondary-700'
                      )}
                    >
                      <option value="">
                        {!firstCategoryId ? 'Escolha o 1º critério primeiro' : 'Selecione uma categoria (opcional)...'}
                      </option>
                      {availableForSecond.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                      <ArrowDown className="h-4 w-4 text-secondary-400" />
                    </div>
                  </div>
                  {secondCategory && (
                    <div className="flex items-center gap-2 text-sm text-primary-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        <strong>{secondCategory.name}</strong> definida como 2º critério
                      </span>
                      {!isFinished && (
                        <button
                          onClick={handleClearSecond}
                          className="ml-2 inline-flex items-center gap-1 text-xs text-danger-500 hover:text-danger-700"
                        >
                          <X className="h-3 w-3" />
                          Remover
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-100">
                <ArrowDown className="h-4 w-4 text-secondary-400" />
              </div>
            </div>

            {/* Final outcome */}
            <div className="relative overflow-hidden rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900">Resultado Final</h3>
                  <p className="text-sm text-secondary-500">
                    Se o empate persistir mesmo após todos os critérios acima, os participantes
                    <strong> mantêm a mesma colocação</strong> e o ranking expande na fronteira.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isFinished && (
            <div className="flex items-center justify-between rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-secondary-500">
                {hasChanges ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-warning-500" />
                    <span>Você tem alterações não salvas.</span>
                  </>
                ) : tiebreaker ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success-500" />
                    <span>Critérios salvos.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-secondary-400" />
                    <span>Nenhum critério configurado.</span>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                {tiebreaker && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowRemoveDialog(true)}
                    loading={isRemoving}
                    disabled={isUpdating}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remover critérios
                  </Button>
                )}
                {hasChanges && (
                  <Button variant="ghost" size="sm" onClick={handleReset} disabled={isUpdating}>
                    Descartar
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={isUpdating}
                  disabled={!isValid || !hasChanges}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Salvar critérios
                </Button>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-4 py-3 text-sm text-secondary-600">
              <AlertCircle className="h-4 w-4" />
              <span>O evento está finalizado. Os critérios de desempate não podem mais ser alterados.</span>
            </div>
          )}

          <ConfirmDialog
            isOpen={showRemoveDialog}
            onClose={() => setShowRemoveDialog(false)}
            onConfirm={() => {
              removeTiebreaker(undefined, {
                onSuccess: () => setShowRemoveDialog(false),
              })
            }}
            title="Remover critérios de desempate"
            message="Tem certeza que deseja remover todos os critérios de desempate? O sistema não aplicará nenhuma regra de desempate neste evento."
            confirmLabel="Remover critérios"
            cancelLabel="Cancelar"
            isDanger
            isLoading={isRemoving}
          />
        </>
      )}
    </div>
  )
}
