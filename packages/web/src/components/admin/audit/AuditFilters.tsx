'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getActionLabel } from '@/lib/action-labels'

const ALL_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'USER_RESTORED',
  'USER_PASSWORD_CHANGED',
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_DELETED',
  'EVENT_STATUS_CHANGED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'CATEGORIES_REORDERED',
  'JUDGE_ADDED',
  'JUDGE_UPDATED',
  'JUDGE_REMOVED',
  'JUDGE_MATRIX_UPDATED',
  'PARTICIPANT_CREATED',
  'PARTICIPANT_UPDATED',
  'PARTICIPANT_DELETED',
  'PARTICIPANTS_REORDERED',
  'PARTICIPANT_PHOTO_UPLOADED',
  'PARTICIPANT_PHOTO_REMOVED',
  'PARTICIPANT_MARKED_ABSENT',
  'PARTICIPANT_UNMARKED_ABSENT',
  'SCORES_REGISTERED',
  'JUDGE_CONFIRMED_SCORES',
  'JUDGE_REVISED_SCORES',
  'JUDGE_FINALIZED_SCORES',
  'REPORT_GENERATION_QUEUED',
  'REPORT_GENERATION_COMPLETED',
  'REPORT_GENERATION_FAILED',
  'REPORT_DOWNLOADED',
  'CERTIFICATE_TEXT_UPDATED',
  'CERTIFICATE_BACKGROUND_UPLOADED',
  'CERTIFICATE_BACKGROUND_REMOVED',
  'CERTIFICATE_SIGNATURE_ADDED',
  'CERTIFICATE_SIGNATURE_REMOVED',
  'CERTIFICATE_BATCH_QUEUED',
  'CERTIFICATE_BATCH_COMPLETED',
  'CERTIFICATE_BATCH_FAILED',
  'CERTIFICATE_BATCH_DOWNLOADED',
]

export interface AuditFilterValues {
  action: string
  actorId: string
  entityType: string
  startDate: string
  endDate: string
}

interface AuditFiltersProps {
  values: AuditFilterValues
  onChange: (values: AuditFilterValues) => void
  hideEntityType?: boolean
}

export function AuditFilters({ values, onChange, hideEntityType }: AuditFiltersProps) {
  const [local, setLocal] = useState(values)

  const handleApply = () => {
    onChange(local)
  }

  const handleReset = () => {
    const reset = { action: '', actorId: '', entityType: '', startDate: '', endDate: '' }
    setLocal(reset)
    onChange(reset)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-secondary-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="action-filter" className="text-xs font-medium text-secondary-500">Ação</label>
        <select
          id="action-filter"
          className="h-10 rounded-md border border-secondary-200 bg-white px-3 text-sm text-secondary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={local.action}
          onChange={(e) => setLocal({ ...local, action: e.target.value })}
        >
          <option value="">Todas</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {getActionLabel(a)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-secondary-500">ID do Ator</label>
        <Input
          id="actorId"
          label=""
          placeholder="UUID do usuário"
          value={local.actorId}
          onChange={(e) => setLocal({ ...local, actorId: e.target.value })}
          className="w-48"
        />
      </div>

      {!hideEntityType && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-secondary-500">Tipo de Entidade</label>
          <select
            className="h-10 rounded-md border border-secondary-200 bg-white px-3 text-sm text-secondary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            value={local.entityType}
            onChange={(e) => setLocal({ ...local, entityType: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="User">Usuário</option>
            <option value="JudgingEvent">Evento</option>
            <option value="Category">Categoria</option>
            <option value="Judge">Jurado</option>
            <option value="Participant">Participante</option>
            <option value="ReportJob">Relatório</option>
            <option value="CertificateConfig">Certificado</option>
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-secondary-500">Data Inicial</label>
        <Input
          id="startDate"
          label=""
          type="date"
          value={local.startDate}
          onChange={(e) => setLocal({ ...local, startDate: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-secondary-500">Data Final</label>
        <Input
          id="endDate"
          label=""
          type="date"
          value={local.endDate}
          onChange={(e) => setLocal({ ...local, endDate: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleApply}>
          Filtrar
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Limpar
        </Button>
      </div>
    </div>
  )
}
