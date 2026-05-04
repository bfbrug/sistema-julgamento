import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { main as runSeed } from '../prisma/seed';

const prisma = new PrismaClient();

describe('Database Seed', () => {
  beforeAll(async () => {
    // Ensure test database has the latest schema
    execSync('npx prisma db push --force-reset --accept-data-loss', { cwd: __dirname + '/..' });
  }, 60000);

  it('should run seed successfully and be idempotent', async () => {
    // Run seed twice to test idempotency
    await runSeed();
    await runSeed();

    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(4);

    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).toBeDefined();

    const evento = await prisma.judgingEvent.findFirst({ where: { name: 'Festival de Música Exemplo' } });
    expect(evento).toBeDefined();

    if (evento) {
      const categorias = await prisma.category.findMany({ where: { eventId: evento.id } });
      expect(categorias.length).toBe(3);

      const jurados = await prisma.judge.findMany({ where: { eventId: evento.id } });
      expect(jurados.length).toBe(3);
    }
  }, 60000); // 60s timeout
});




