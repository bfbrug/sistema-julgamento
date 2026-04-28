import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function main() {
  const passwordHash = await bcrypt.hash('changeMe123!', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Administrador',
      role: 'GESTOR',
    },
  });

  const jurado1 = await prisma.user.upsert({
    where: { email: 'jurado1@example.com' },
    update: {},
    create: {
      email: 'jurado1@example.com',
      passwordHash,
      name: 'Jurado Um',
      role: 'JURADO',
    },
  });

  const jurado2 = await prisma.user.upsert({
    where: { email: 'jurado2@example.com' },
    update: {},
    create: {
      email: 'jurado2@example.com',
      passwordHash,
      name: 'Jurado Dois',
      role: 'JURADO',
    },
  });

  const jurado3 = await prisma.user.upsert({
    where: { email: 'jurado3@example.com' },
    update: {},
    create: {
      email: 'jurado3@example.com',
      passwordHash,
      name: 'Jurado Três',
      role: 'JURADO',
    },
  });

  const evento = await prisma.judgingEvent.upsert({
    where: { id: 'evento-teste-123' },
    update: {
      status: 'REGISTERING',
    },
    create: {
      id: 'evento-teste-123',
      name: 'Festival de Música Exemplo',
      eventDate: new Date('2026-12-15T00:00:00Z'),
      location: 'Auditório Central',
      organizer: 'Escola de Música Demo',
      managerId: admin.id,
      calculationRule: 'R2',
      scoreMin: 5.0,
      scoreMax: 10.0,
      topN: 10,
      status: 'REGISTERING',
    },
  });

  const cat1 = await prisma.category.upsert({
    where: { eventId_name: { eventId: evento.id, name: 'Técnica vocal' } },
    update: {},
    create: { eventId: evento.id, name: 'Técnica vocal', displayOrder: 1 },
  });

  const cat2 = await prisma.category.upsert({
    where: { eventId_name: { eventId: evento.id, name: 'Interpretação' } },
    update: {},
    create: { eventId: evento.id, name: 'Interpretação', displayOrder: 2 },
  });

  const cat3 = await prisma.category.upsert({
    where: { eventId_name: { eventId: evento.id, name: 'Presença de palco' } },
    update: {},
    create: { eventId: evento.id, name: 'Presença de palco', displayOrder: 3 },
  });

  const jProfile1 = await prisma.judge.upsert({
    where: { userId_eventId: { userId: jurado1.id, eventId: evento.id } },
    update: {},
    create: { userId: jurado1.id, eventId: evento.id, displayName: 'Prof. Jurado Um' },
  });

  const jProfile2 = await prisma.judge.upsert({
    where: { userId_eventId: { userId: jurado2.id, eventId: evento.id } },
    update: {},
    create: { userId: jurado2.id, eventId: evento.id, displayName: 'Prof. Jurado Dois' },
  });

  const jProfile3 = await prisma.judge.upsert({
    where: { userId_eventId: { userId: jurado3.id, eventId: evento.id } },
    update: {},
    create: { userId: jurado3.id, eventId: evento.id, displayName: 'Prof. Jurado Três' },
  });

  // Jurado 1 -> todas as 3 categorias
  for (const cat of [cat1, cat2, cat3]) {
    await prisma.judgeCategory.upsert({
      where: { judgeId_categoryId: { judgeId: jProfile1.id, categoryId: cat.id } },
      update: {},
      create: { judgeId: jProfile1.id, categoryId: cat.id },
    });
  }

  // Jurado 2 -> todas as 3 categorias
  for (const cat of [cat1, cat2, cat3]) {
    await prisma.judgeCategory.upsert({
      where: { judgeId_categoryId: { judgeId: jProfile2.id, categoryId: cat.id } },
      update: {},
      create: { judgeId: jProfile2.id, categoryId: cat.id },
    });
  }

  // Jurado 3 -> apenas Técnica vocal
  await prisma.judgeCategory.upsert({
    where: { judgeId_categoryId: { judgeId: jProfile3.id, categoryId: cat1.id } },
    update: {},
    create: { judgeId: jProfile3.id, categoryId: cat1.id },
  });

  for (let i = 1; i <= 4; i++) {
    await prisma.participant.upsert({
      where: { eventId_presentationOrder: { eventId: evento.id, presentationOrder: i } },
      update: {},
      create: {
        eventId: evento.id,
        name: `Participante ${i}`,
        presentationOrder: i,
        currentState: 'WAITING',
      },
    });
  }

  await prisma.tiebreakerConfig.upsert({
    where: { eventId: evento.id },
    update: { firstCategoryId: cat1.id },
    create: {
      eventId: evento.id,
      firstCategoryId: cat1.id,
    },
  });

  console.log('Seed executado com sucesso: Usuários, Evento, Categorias, Jurados e Participantes criados.');
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

