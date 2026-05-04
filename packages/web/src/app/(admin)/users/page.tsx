'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsers, useDeleteUser, useUpdateUserStatus } from '@/hooks/useUsers'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Edit, UserCog, Shield, Plus, Trash2, Power } from 'lucide-react'
import Link from 'next/link'
import { UserRole, type User } from '@judging/shared'
import { cn } from '@/lib/utils'

type UserRow = User

export default function UsersPage() {
  const router = useRouter()
  const { data: users, isLoading } = useUsers({ excludeRole: 'JURADO' })
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser()
  const { mutate: updateUser } = useUpdateUserStatus()
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)

  const columns = [
    { header: 'Nome', accessor: 'name' as const },
    { header: 'E-mail', accessor: 'email' as const },
    { 
      header: 'Role', 
      accessor: (user: UserRow) => (
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
          roleColors[user.role as UserRole]
        )}>
          {user.role === UserRole.GESTOR && <Shield className="h-3 w-3" />}
          {user.role}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessor: (user: UserRow) => (
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          user.isActive ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-500'
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', user.isActive ? 'bg-success-500' : 'bg-secondary-400')} />
          {user.isActive ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      header: 'Ações',
      accessor: (user: UserRow) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" title="Editar" onClick={() => router.push(`/users/${user.id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" title="Gerenciar Senha" onClick={() => router.push(`/users/${user.id}/reset-password`)}>
            <UserCog className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title={user.isActive ? 'Desativar' : 'Ativar'}
            className={user.isActive ? 'text-success-500 hover:text-success-700' : 'text-secondary-400 hover:text-secondary-600'}
            onClick={() => updateUser({ id: user.id, data: { isActive: !user.isActive } })}
          >
            <Power className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Excluir"
            className="text-danger-500 hover:text-danger-700"
            onClick={() => setUserToDelete(user)}
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
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) {
            deleteUser(userToDelete.id, { onSettled: () => setUserToDelete(null) })
          }
        }}
        title="Excluir usuário"
        message={`Tem certeza que deseja excluir "${userToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
      />
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários e suas permissões no sistema."
        action={
          <Link href="/users/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="Nenhum usuário encontrado."
      />
    </>
  )
}

const roleColors: Record<UserRole, string> = {
  [UserRole.GESTOR]: 'bg-primary-100 text-primary-700',
  [UserRole.JURADO]: 'bg-secondary-100 text-secondary-700',
}
