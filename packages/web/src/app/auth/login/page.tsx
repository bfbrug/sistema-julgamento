'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const isEmpty = email.trim() === '' || senha.trim() === ''

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card
        className="w-full max-w-sm"
        header={<h1 className="text-xl font-semibold text-secondary-900">Entrar</h1>}
        body={
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <Input
              id="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            <Input
              id="senha"
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isEmpty}
              onClick={() => {
                // TODO P03: implementar submit de login
              }}
            >
              Entrar
            </Button>
          </form>
        }
      />
    </div>
  )
}
