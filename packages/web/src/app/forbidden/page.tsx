import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ShieldAlert } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <ShieldAlert className="h-16 w-16 text-danger-500 mb-4" />
      <h1 className="text-3xl font-bold text-secondary-900 mb-2">Acesso Negado</h1>
      <p className="text-secondary-600 mb-8 max-w-md">
        Você não tem permissão para acessar esta área. Se você acredita que isso é um erro, entre em contato com o administrador.
      </p>
      <Link href="/dashboard">
        <Button>Voltar para o Início</Button>
      </Link>
    </div>
  )
}
