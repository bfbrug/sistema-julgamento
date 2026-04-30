'use client'

import { getActionLabel } from '@/lib/action-labels'

interface ActionLabelProps {
  action: string
}

export function ActionLabel({ action }: ActionLabelProps) {
  return <span>{getActionLabel(action)}</span>
}
