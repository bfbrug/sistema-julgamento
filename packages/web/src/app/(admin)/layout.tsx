import type { ReactNode } from 'react'
import { Sidebar } from '@/components/admin/Sidebar'

// TODO P03: redirecionar se não autenticado

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
