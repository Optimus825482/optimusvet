require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkBalance() {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: "Funda", mode: "insensitive" } },
          { name: { contains: "KISIRLASTIRMA", mode: "insensitive" } },
        ],
      },
      select: {
        name: true,
        balance: true,
        code: true,
      },
    });

    console.log("Müşteri Bakiyeleri:");
    customers.forEach((c) => {
      console.log(`${c.name} (${c.code}): ${c.balance}`);
    });
  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBalance();
