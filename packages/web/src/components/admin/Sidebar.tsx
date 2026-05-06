'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Users, Settings, FileSearch, Gavel } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Eventos', icon: Calendar },
  { href: '/judges', label: 'Jurados', icon: Gavel },
  { href: '/users', label: 'Usuários', icon: Users },
  { href: '/audit', label: 'Auditoria', icon: FileSearch },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-secondary-200 bg-white">
      <div className="flex h-16 items-center border-b border-secondary-200 px-6">
        <span className="text-lg font-bold text-primary-700">Jurados</span>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu principal">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-primary-600' : 'text-secondary-400 group-hover:text-secondary-500')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-secondary-200 p-4">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900"
        >
          <Settings className="h-5 w-5 text-secondary-400 group-hover:text-secondary-500" />
          Configurações
        </Link>
      </div>
    </aside>
  )
}
