'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { loginSchema } from '@judging/shared'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)

  const validation = loginSchema.safeParse({ email, password: senha })
  const isValid = validation.success

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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={!isValid}
              onClick={() => {
                // TODO P03: implementar submit de login
                if (!isValid) {
                  setError(validation.error.errors[0]!.message)
                  return
                }
                console.log('Login validado via Zod shared')
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

