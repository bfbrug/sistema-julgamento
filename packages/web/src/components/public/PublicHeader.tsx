import Link from 'next/link'

export function PublicHeader() {
  return (
    <header className="border-b border-secondary-200 bg-white px-6 py-4">
      <nav className="flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Sistema de Julgamento
        </Link>
        <Link
          href="/auth/login"
          className="rounded px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Entrar
        </Link>
      </nav>
    </header>
  )
}
