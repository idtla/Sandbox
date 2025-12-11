import 'dotenv/config';
import { PrismaClient, Role } from '../src/generated/prisma';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_PMO_EMAIL ?? 'pmo@example.com';
  const password = process.env.SEED_PMO_PASSWORD ?? 'changeme';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'PMO',
      password: await hashPassword(password),
      role: Role.PMO,
      hourlyRate: 0,
      color: '#006064',
    },
  });

  console.log(`Usuario PMO disponible -> ${user.email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
