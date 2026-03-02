const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, role: true }
        });
        console.log('Users in DB:');
        console.table(users);
    } catch (err) {
        console.error('Error finding users:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
