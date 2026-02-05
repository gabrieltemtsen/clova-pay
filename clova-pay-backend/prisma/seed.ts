import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create local mock orders
    const order1 = await prisma.order.upsert({
        where: { stacksOrderId: 1001 },
        update: {},
        create: {
            stacksOrderId: 1001,
            sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
            amount: BigInt(100000000), // 100 STX
            fee: BigInt(1000000), // 1 STX
            fiatAmount: BigInt(15000000), // 150,000 kobo (1,500 NGN)
            fiatCurrency: 'NGN',
            bankDetailsHash: '0x1234567890abcdef',
            status: 'PENDING',
        },
    });

    const order2 = await prisma.order.upsert({
        where: { stacksOrderId: 1002 },
        update: {},
        create: {
            stacksOrderId: 1002,
            sender: 'ST2CY5V39NHDPWSXMW9QDT3HC3PG6QGP9MD26G3GZ',
            amount: BigInt(50000000), // 50 STX
            fee: BigInt(500000), // 0.5 STX
            fiatAmount: BigInt(7500000), // 75,000 kobo
            fiatCurrency: 'NGN',
            bankDetailsHash: '0xabcdef1234567890',
            status: 'CONFIRMED',
            confirmedAt: new Date(),
        },
    });

    console.log({ order1, order2 });
    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
