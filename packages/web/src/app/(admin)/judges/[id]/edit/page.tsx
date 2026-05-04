'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/admin/PageHeader'
import { useUser, useUpdateUser } from '@/hooks/useUsers'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function EditJudgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: judge, isLoading } = useUser(id)
  const { mutateAsync, isPending } = useUpdateUser(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (judge) {
      reset({ name: judge.name, isActive: judge.isActive })
    }
  }, [judge, reset])

  const onSubmit = async (data: FormData) => {
    await mutateAsync(data)
    router.push('/judges')
  }

  if (isLoading) return <div className="p-8 text-secondary-500">Carregando...</div>

  return (
    <>
      <PageHeader title="Editar Jurado" description={judge?.email ?? ''} />
      <Card
        className="max-w-lg"
        body={
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="name"
              label="Nome"
              {...register('name')}
              error={errors.name?.message}
            />
            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-secondary-700">Jurado ativo</label>
            </div>
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={!isValid || isPending} loading={isPending}>
                Salvar
              </Button>
            </div>
          </form>
        }
      />
    </>
  )
}
