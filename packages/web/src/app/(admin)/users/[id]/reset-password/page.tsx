'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/admin/PageHeader'
import { useUser, useResetUserPassword } from '@/hooks/useUsers'
import { toast } from 'sonner'

const schema = z
  .object({
    newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(72),
    confirmPassword: z.string().min(1, 'Obrigatório'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: user } = useUser(id)
  const { mutateAsync, isPending } = useResetUserPassword(id)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const onSubmit = async (data: FormData) => {
    await mutateAsync(data.newPassword)
    toast.success('Senha redefinida com sucesso.')
    setTimeout(() => router.push('/users'), 1500)
  }

  return (
    <>
      <PageHeader
        title="Redefinir Senha"
        description={user ? `Definir nova senha para ${user.name}` : 'Carregando...'}
      />
      <Card
        className="max-w-sm"
        body={
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
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
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={!isValid || isPending} loading={isPending}>
                Redefinir
              </Button>
            </div>
          </form>
        }
      />
    </>
  )
}
