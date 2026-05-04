'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsers, useDeleteUser, useUpdateUserStatus } from '@/hooks/useUsers'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Edit, UserCog, Plus, Trash2, Power } from 'lucide-react'
import Link from 'next/link'
import { type User } from '@judging/shared'
import { cn } from '@/lib/utils'

type JudgeRow = User

export default function JudgesPage() {
  const router = useRouter()
  const { data: judges, isLoading } = useUsers({ role: 'JURADO' })
  const { mutate: deleteJudge, isPending: isDeleting } = useDeleteUser()
  const { mutate: updateJudge } = useUpdateUserStatus()
  const [judgeToDelete, setJudgeToDelete] = useState<JudgeRow | null>(null)

  const columns = [
    { header: 'Nome', accessor: 'name' as const },
    { header: 'E-mail', accessor: 'email' as const },
    { 
      header: 'Status', 
      accessor: (judge: JudgeRow) => (
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          judge.isActive ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-500'
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', judge.isActive ? 'bg-success-500' : 'bg-secondary-400')} />
          {judge.isActive ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      header: 'Ações',
      accessor: (judge: JudgeRow) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" title="Editar" onClick={() => router.push(`/judges/${judge.id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" title="Gerenciar Senha" onClick={() => router.push(`/judges/${judge.id}/reset-password`)}>
            <UserCog className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title={judge.isActive ? 'Desativar' : 'Ativar'}
            className={judge.isActive ? 'text-success-500 hover:text-success-700' : 'text-secondary-400 hover:text-secondary-600'}
            onClick={() => updateJudge({ id: judge.id, data: { isActive: !judge.isActive } })}
          >
            <Power className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Excluir"
            className="text-danger-500 hover:text-danger-700"
            onClick={() => setJudgeToDelete(judge)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <ConfirmDialog
        isOpen={!!judgeToDelete}
        onClose={() => setJudgeToDelete(null)}
        onConfirm={() => {
          if (judgeToDelete) {
            deleteJudge(judgeToDelete.id, { onSettled: () => setJudgeToDelete(null) })
          }
        }}
        title="Excluir jurado"
        message={`Tem certeza que deseja excluir "${judgeToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
      />
      <PageHeader
        title="Jurados"
        description="Gerencie os jurados do sistema."
        action={
          <Link href="/judges/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Jurado
            </Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={judges}
        isLoading={isLoading}
        emptyMessage="Nenhum jurado encontrado."
      />
    </>
  )
}
