'use client'

import { useAuthStore } from '@/stores/auth.store'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { UserRole } from '@judging/shared'

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuthStore()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${pathname}`)
      return
    }

    if (user?.role !== UserRole.GESTOR) {
      router.push('/forbidden')
      return
    }

    setIsAuthorized(true)
  }, [isAuthenticated, user, router, pathname])

  if (!isAuthorized) {
    return null // Ou um skeleton/spinner
  }

  return <>{children}</>
}
