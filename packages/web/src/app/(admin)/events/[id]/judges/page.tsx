'use client'

import { useParams } from 'next/navigation'
import { useJudges, useAddJudge, useRemoveJudge, useUpdateAssignments } from '@/hooks/useJudges'
import { useCategories } from '@/hooks/useCategories'
import { useUsers } from '@/hooks/useUsers'
import { useEvent } from '@/hooks/useEvents'
import { Card } from '@/components/ui/Card'
import { UserRole, CalculationRule, type JudgeResponse } from '@judging/shared'
import { Trash2, UserPlus, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function EventJudgesPage() {
  const { id: eventId } = useParams() as { id: string }
  const { data: event } = useEvent(eventId)
  const { data: categories } = useCategories(eventId)
  const { data: judges, isLoading: loadingJudges } = useJudges(eventId)
  const { data: allUsers } = useUsers({ role: UserRole.JURADO, isActive: true })
  
  const { mutate: addJudge } = useAddJudge(eventId)
  const { mutate: removeJudge } = useRemoveJudge(eventId)
  const { mutate: updateAssignments, isPending: isSaving } = useUpdateAssignments(eventId)

  const [assignments, setAssignments] = useState<Record<string, string[]>>({}) // judgeId -> categoryIds[]
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (judges) {
      const initial: Record<string, string[]> = {}
      judges.forEach((j: JudgeResponse) => {
        initial[j.id] = j.categories.map((c) => c.id)
      })
      setAssignments(initial)
    }
  }, [judges])

  const toggleAssignment = (judgeId: string, categoryId: string) => {
    setAssignments((prev) => {
      const current = prev[judgeId] || []
      const next = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
      return { ...prev, [judgeId]: next }
    })
  }

  const handleSave = () => {
    const payload = Object.entries(assignments).flatMap(([judgeId, categoryIds]) =>
      categoryIds.map((categoryId) => ({ judgeId, categoryId }))
    )
    updateAssignments(payload)
  }

  if (loadingJudges || !categories || !event) return <div>Carregando...</div>

  const judgeCountsPerCategory = categories.map((cat) => {
    const count = Object.values(assignments).filter((cats) => cats.includes(cat.id)).length
    return { categoryId: cat.id, count }
  })

  const hasInvalidCategory = judgeCountsPerCategory.some((c) => c.count === 0)
  const hasR1Fallback = event.calculationRule === CalculationRule.R2 && judgeCountsPerCategory.some((c) => c.count < 3 && c.count > 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-secondary-900">Matriz de Atribuições</h3>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Jurado
        </Button>
      </div>

      <Card
        body={
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="sticky left-0 bg-secondary-50 border-b border-r border-secondary-200 px-4 py-3 font-semibold text-secondary-700 min-w-[200px]">
                    Jurado
                  </th>
                  {categories.map((cat) => (
                    <th key={cat.id} className="border-b border-secondary-200 px-4 py-3 font-semibold text-secondary-700 text-center min-w-[120px]">
                      {cat.name}
                    </th>
                  ))}
                  <th className="border-b border-secondary-200 px-4 py-3 font-semibold text-secondary-700 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {judges?.map((judge) => (
                  <tr key={judge.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="sticky left-0 bg-white group-hover:bg-secondary-50 border-b border-r border-secondary-200 px-4 py-3 font-medium text-secondary-900">
                      {judge.user.name}
                    </td>
                    {categories.map((cat) => (
                      <td key={cat.id} className="border-b border-secondary-200 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={assignments[judge.id]?.includes(cat.id) || false}
                          onChange={() => toggleAssignment(judge.id, cat.id)}
                          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                    ))}
                    <td className="border-b border-secondary-200 px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                        onClick={() => removeJudge(judge.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary-50 font-medium">
                  <td className="sticky left-0 bg-secondary-50 border-r border-secondary-200 px-4 py-3">Total de Jurados</td>
                  {judgeCountsPerCategory.map((item) => (
                    <td
                      key={item.categoryId}
                      className={cn(
                        'px-4 py-3 text-center border-t border-secondary-200',
                        item.count >= 3 ? 'text-success-700 bg-success-50' :
                        item.count >= 1 ? 'text-warning-700 bg-warning-50' :
                        'text-danger-700 bg-danger-50'
                      )}
                    >
                      {item.count}
                    </td>
                  ))}
                  <td className="border-t border-secondary-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      />

      {(hasInvalidCategory || hasR1Fallback) && (
        <div className={cn(
          'p-4 rounded-lg flex items-start gap-3',
          hasInvalidCategory ? 'bg-danger-50 text-danger-800' : 'bg-warning-50 text-warning-800'
        )}>
          <Info className="h-5 w-5 mt-0.5" />
          <div className="text-sm">
            {hasInvalidCategory && (
              <p className="font-bold">Impossível salvar: existem categorias sem nenhum jurado atribuído.</p>
            )}
            {hasR1Fallback && (
              <p>
                <strong>Aviso de fallback:</strong> Categorias com 1 ou 2 jurados usarão a regra <strong>R1 (Média Simples)</strong>, mesmo que o evento seja R2.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving} disabled={hasInvalidCategory}>
          Salvar Alterações
        </Button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-secondary-900/50" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-secondary-900 mb-4">Adicionar Jurado</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {allUsers?.filter(u => !judges?.some(j => j.user.id === u.id)).map(user => (
                <button
                  key={user.id}
                  className="flex w-full items-center justify-between p-3 rounded hover:bg-secondary-50 border border-secondary-100 transition-colors"
                  onClick={() => {
                    addJudge({ userId: user.id })
                    setShowAddModal(false)
                  }}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-secondary-500">{user.email}</span>
                </button>
              ))}
              {allUsers?.length === 0 && <p className="text-center text-secondary-500">Nenhum jurado disponível.</p>}
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
