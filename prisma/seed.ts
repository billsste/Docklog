import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Default workers with simple PINs
  const workers = [
    { name: "Steve", pin: "1111", role: "WORKER" as const },
    { name: "Peter", pin: "2222", role: "ADMIN" as const },
    { name: "Rick", pin: "3333", role: "WORKER" as const },
  ];

  for (const w of workers) {
    const hashedPin = await bcrypt.hash(w.pin, 10);
    await prisma.user.upsert({
      where: { id: w.name.toLowerCase() },
      update: {},
      create: {
        id: w.name.toLowerCase(),
        name: w.name,
        pin: hashedPin,
        role: w.role,
      },
    });
    console.log(`  Created ${w.role}: ${w.name} (PIN: ${w.pin})`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
