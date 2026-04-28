import type { ReactNode } from 'react'
import { PublicHeader } from '@/components/public/PublicHeader'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
