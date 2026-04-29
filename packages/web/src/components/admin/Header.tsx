'use client'

import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { LogOut, User, Key, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'

export function Header() {
  const { user, clearSession } = useAuthStore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    clearSession()
    router.push('/auth/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {/* Placeholder para breadcrumbs ou título da página */}
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg p-2 hover:bg-secondary-50 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold uppercase">
            {user?.name?.[0]}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-secondary-900">{user?.name}</p>
            <p className="text-xs text-secondary-500">{user?.role}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-secondary-400" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-secondary-200 bg-white py-1 shadow-lg z-20">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/users/me/change-password')
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
              >
                <Key className="h-4 w-4" />
                Trocar senha
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
