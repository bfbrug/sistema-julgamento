'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { loginSchema, type LoginDto, type LoginResponse } from '@judging/shared'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { useState, Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginDto) => {
    setIsLoading(true)
    try {
      const response = await apiClient<LoginResponse, LoginDto>({
        method: 'POST',
        path: '/auth/login',
        body: data,
      })

      setSession(response)
      toast.success(`Bem-vindo, ${response.user.name}!`)

      const next = searchParams.get('next') || '/dashboard'
      router.push(next)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Credenciais inválidas.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card
        className="w-full max-w-sm"
        header={<h1 className="text-xl font-semibold text-secondary-900">Entrar</h1>}
        body={
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="seu@email.com"
            />
            <Input
              id="password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="••••••••"
            />
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={!isValid || isLoading}
              loading={isLoading}
            >
              Entrar
            </Button>
          </form>
        }
      />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
