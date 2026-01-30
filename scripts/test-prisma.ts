import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("DB URL:", process.env.DATABASE_URL);
  const users = await prisma.user.count();
  console.log("User count:", users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
