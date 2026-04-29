'use client'

import type { ReactNode } from 'react'
import { JudgeGuard } from '@/components/judge/JudgeGuard'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function JudgeLayout({ children }: { children: ReactNode }) {
  const { user, clearSession } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    clearSession()
    router.push('/auth/login')
  }

  return (
    <JudgeGuard>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <header className="flex items-center justify-between border-b border-secondary-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-600">
              <span className="text-sm font-bold text-white">SJ</span>
            </div>
            <span className="text-sm font-semibold text-secondary-700 hidden sm:inline">
              Sistema de Julgamento
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary-600 hidden sm:inline">
              {user?.name ?? 'Jurado'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </JudgeGuard>
  )
}
