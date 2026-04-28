import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="mb-4 text-4xl font-bold text-secondary-900">Sistema de Julgamento</h1>
      <p className="mb-8 max-w-lg text-lg text-secondary-600">
        Gerencie eventos, jurados e participantes. Acompanhe o julgamento em tempo real.
      </p>
      <Link href="/auth/login">
        <Button size="lg">Acessar o sistema</Button>
      </Link>
    </div>
  )
}
