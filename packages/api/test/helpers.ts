import { PrismaService } from '../src/config/prisma.service'

export async function cleanDb(prisma: PrismaService): Promise<void> {
  // Será implementado nos prompts futuros quando os models existirem
  void prisma
}
