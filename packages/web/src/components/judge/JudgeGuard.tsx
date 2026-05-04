'use client'

import { useAuthStore } from '@/stores/auth.store'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { UserRole } from '@judging/shared'

export function JudgeGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    // Se já está autenticado em memória (recém fez login), não aguarda hidratação do localStorage
    if (isAuthenticated) setHydrated(true)
    return unsub
  }, [isAuthenticated])

  useEffect(() => {
    if (!hydrated) return

    if (!isAuthenticated) {
      router.push(`/auth/login?next=${pathname}`)
      return
    }

    if (user?.role === UserRole.GESTOR) {
      router.push('/dashboard')
      return
    }

    if (user?.role !== UserRole.JURADO) {
      router.push('/forbidden')
      return
    }

    setIsAuthorized(true)
  }, [hydrated, isAuthenticated, user, router, pathname])

  if (!isAuthorized) return null

  return <>{children}</>
}
