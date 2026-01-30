import { prisma } from "../src/lib/prisma";

async function checkSettings() {
  try {
    console.log("🔍 Checking settings in database...\n");

    const settings = await prisma.setting.findMany();

    if (settings.length === 0) {
      console.log("❌ No settings found in database!");
      return;
    }

    console.log(`✅ Found ${settings.length} settings:\n`);

    settings.forEach((setting) => {
      console.log(`  ${setting.key}: ${setting.value}`);
    });

    console.log("\n📋 Clinic Name specifically:");
    const clinicName = settings.find((s) => s.key === "clinicName");
    if (clinicName) {
      console.log(`  ✅ clinicName = "${clinicName.value}"`);
    } else {
      console.log(`  ❌ clinicName not found in database!`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSettings();
