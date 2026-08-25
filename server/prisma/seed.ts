import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Clear existing data first (order matters due to FK constraints)
    await prisma.share.deleteMany();
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();

    const aditya = await prisma.user.create({
        data: { name: 'Aditya', email: 'aditya@ajaia.test' },
    });

    const rahul = await prisma.user.create({
        data: { name: 'Rahul', email: 'rahul@ajaia.test' },
    });

    console.log('Seeded users:', { aditya, rahul });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
