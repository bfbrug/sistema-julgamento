import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('12345678', 12)
  const user = await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: { passwordHash: hash },
  })
  console.log('Password reset for:', user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
