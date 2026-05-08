import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const eventId = process.argv[2] || 'evento-teste-123'

  const event = await prisma.judgingEvent.findUnique({ where: { id: eventId } })
  if (!event) {
    console.error('Evento nao encontrado')
    process.exit(1)
  }

  console.log(`Evento: ${event.name} (status: ${event.status})`)

  // 1. Encontrar judges orfaos (usuario deletado)
  const orphanJudges = await prisma.judge.findMany({
    where: { eventId },
    include: { user: true },
  })

  const deletedJudges = orphanJudges.filter((j) => j.user.deletedAt !== null)
  console.log(`Jurados orfaos encontrados: ${deletedJudges.length}`)

  for (const judge of deletedJudges) {
    const judgeId = judge.id

    const scoresDeleted = await prisma.score.deleteMany({ where: { judgeId } })
    console.log(`  Judge ${judgeId}: ${scoresDeleted.count} scores deletados`)

    const sessionsDeleted = await prisma.judgeParticipantSession.deleteMany({
      where: { judgeId },
    })
    console.log(`  Judge ${judgeId}: ${sessionsDeleted.count} sessoes deletadas`)

    const catsDeleted = await prisma.judgeCategory.deleteMany({
      where: { judgeId },
    })
    console.log(`  Judge ${judgeId}: ${catsDeleted.count} categorias deletadas`)

    await prisma.judge.delete({ where: { id: judgeId } })
    console.log(`  Judge ${judgeId}: removido`)
  }

  // 2. Resetar participantes para WAITING
  const participants = await prisma.participant.findMany({ where: { eventId } })

  for (const p of participants) {
    if (p.currentState !== 'WAITING') {
      await prisma.participant.update({
        where: { id: p.id },
        data: { currentState: 'WAITING' },
      })

      await prisma.participantStateLog.create({
        data: {
          participantId: p.id,
          state: 'WAITING',
          changedByUserId: event.managerId,
        },
      })
    }
  }

  // 3. Voltar evento para DRAFT
  await prisma.judgingEvent.update({
    where: { id: eventId },
    data: { status: 'DRAFT' },
  })

  console.log('\n✅ Evento recuperado com sucesso! Status voltou para DRAFT.')
  console.log('Voce pode agora ajustar os jurados e reiniciar o julgamento.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
