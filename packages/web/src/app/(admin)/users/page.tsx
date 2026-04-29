'use client'

import { useUsers } from '@/hooks/useUsers'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { Edit, UserCog, Shield, Plus } from 'lucide-react'
import Link from 'next/link'
import { UserRole } from '@judging/shared'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  [key: string]: unknown
}

export default function UsersPage() {
  const { data: users, isLoading } = useUsers()

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
      header: 'Ativo', 
      accessor: (user: UserRow) => (
        <span className={cn(
          'h-2 w-2 rounded-full inline-block mr-2',
          user.isActive ? 'bg-success-500' : 'bg-secondary-300'
        )} />
      )
    },
    {
      header: 'Ações',
      accessor: () => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" title="Gerenciar Senha">
            <UserCog className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
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
  [UserRole.PUBLICO]: 'bg-neutral-100 text-neutral-700',
}
