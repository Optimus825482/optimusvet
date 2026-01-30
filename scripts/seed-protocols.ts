import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const protocols = [
    {
      name: "Köpek Standart Aşılama Protokolü",
      type: "VACCINATION",
      description:
        "Yavru köpekler için 6-16 hafta arası temel aşılama programı.",
      steps: [
        {
          name: "Paraziter Uygulama (İç/Dış)",
          dayOffset: 0,
          notes: "Protokol başlangıcı",
          order: 0,
        },
        {
          name: "Karma Aşı (DHPPI+L) - 1",
          dayOffset: 14,
          notes: "İlk doz",
          order: 1,
        },
        {
          name: "Karma Aşı (DHPPI+L) - 2",
          dayOffset: 35,
          notes: "Tekrar dozu",
          order: 2,
        },
        {
          name: "Bordetella / Bronchine",
          dayOffset: 49,
          notes: "Barınak öksürüğü aşısı",
          order: 3,
        },
        {
          name: "Kuduz Aşısı (Rabies)",
          dayOffset: 63,
          notes: "Yıllık tek doz",
          order: 4,
        },
      ],
    },
    {
      name: "Kedi Standart Aşılama Protokolü",
      type: "VACCINATION",
      description: "Yavru kediler için temel karma ve lösemi aşılama programı.",
      steps: [
        {
          name: "Paraziter Uygulama",
          dayOffset: 0,
          notes: "İç ve dış parazit",
          order: 0,
        },
        {
          name: "Karma Aşı (RCP) - 1",
          dayOffset: 14,
          notes: "İlk doz",
          order: 1,
        },
        {
          name: "Karma Aşı (RCP) - 2",
          dayOffset: 35,
          notes: "Tekrar dozu",
          order: 2,
        },
        {
          name: "Lösemi Aşısı (FeLV) - 1",
          dayOffset: 49,
          notes: "İlk doz",
          order: 3,
        },
        {
          name: "Kuduz Aşısı",
          dayOffset: 63,
          notes: "Yıllık tek doz",
          order: 4,
        },
      ],
    },
    {
      name: "Sığır Fertilite / Senkronizasyon (Ovsynch)",
      type: "FERTILITY",
      description:
        "Sığırlarda kızgınlık senkronizasyonu için standart Ovsynch protokolü.",
      steps: [
        {
          name: "GnRH Uygulaması",
          dayOffset: 0,
          notes: "Follikül dalgası başlatma",
          order: 0,
        },
        {
          name: "PGF2α Uygulaması",
          dayOffset: 7,
          notes: "Luteolizis",
          order: 1,
        },
        {
          name: "GnRH Uygulaması & Tohumlama",
          dayOffset: 9,
          notes: "Ovulasyon tetikleme ve suni tohumlama",
          order: 2,
        },
      ],
    },
  ];

  console.log("Seeding protocol templates...");

  for (const p of protocols) {
    const existing = await prisma.protocol.findFirst({
      where: { name: p.name },
    });
    if (!existing) {
      await prisma.protocol.create({
        data: {
          name: p.name,
          type: p.type as any,
          description: p.description,
          steps: {
            create: p.steps.map((s) => ({
              name: s.name,
              dayOffset: s.dayOffset,
              notes: s.notes,
              order: s.order,
            })),
          },
        },
      });
      console.log(`Created: ${p.name}`);
    } else {
      console.log(`Skipped (exists): ${p.name}`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
