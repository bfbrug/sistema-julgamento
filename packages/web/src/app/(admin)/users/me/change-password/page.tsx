'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Obrigatório'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirmPassword: z.string().min(1, 'Obrigatório'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await apiClient({
        method: 'POST',
        path: '/users/me/change-password',
        body: { currentPassword: data.currentPassword, newPassword: data.newPassword },
      })
      toast.success('Senha alterada com sucesso.')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card
        className="w-full max-w-sm"
        header={<h1 className="text-xl font-semibold text-secondary-900">Trocar senha</h1>}
        body={
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="currentPassword"
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
              error={errors.currentPassword?.message}
            />
            <Input
              id="newPassword"
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
              error={errors.newPassword?.message}
            />
            <Input
              id="confirmPassword"
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!isValid || isLoading}
                loading={isLoading}
              >
                Salvar
              </Button>
            </div>
          </form>
        }
      />
    </div>
  )
}
