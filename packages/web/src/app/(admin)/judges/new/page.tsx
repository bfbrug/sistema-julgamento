'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/admin/PageHeader'
import { useCreateUser } from '@/hooks/useUsers'
import { UserRole } from '@judging/shared'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
})

type FormData = z.infer<typeof schema>

export default function NewJudgePage() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateUser()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const onSubmit = async (data: FormData) => {
    await mutateAsync({ ...data, role: UserRole.JURADO })
    router.push('/judges')
  }

  return (
    <>
      <PageHeader
        title="Novo Jurado"
        description="Cadastre um novo jurado no sistema."
      />
      <Card
        className="max-w-lg"
        body={
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="name"
              label="Nome"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Nome completo"
            />
            <Input
              id="email"
              label="E-mail"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="jurado@email.com"
            />
            <Input
              id="password"
              label="Senha"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="Mínimo 8 caracteres"
            />
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!isValid || isPending}
                loading={isPending}
              >
                Criar Jurado
              </Button>
            </div>
          </form>
        }
      />
    </>
  )
}
