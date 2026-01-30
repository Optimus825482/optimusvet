import {
  PrismaClient,
  Species,
  Gender,
  TransactionType,
  PaymentMethod,
  ProtocolType,
  ReminderType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@optimusvet.com" },
    update: {},
    create: {
      email: "admin@optimusvet.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Aşılar" },
      update: {},
      create: { name: "Aşılar", color: "#3b82f6" },
    }),
    prisma.category.upsert({
      where: { name: "İlaçlar" },
      update: {},
      create: { name: "İlaçlar", color: "#10b981" },
    }),
    prisma.category.upsert({
      where: { name: "Mama & Beslenme" },
      update: {},
      create: { name: "Mama & Beslenme", color: "#f59e0b" },
    }),
    prisma.category.upsert({
      where: { name: "Aksesuar" },
      update: {},
      create: { name: "Aksesuar", color: "#8b5cf6" },
    }),
    prisma.category.upsert({
      where: { name: "Hizmetler" },
      update: {},
      create: { name: "Hizmetler", color: "#ec4899" },
    }),
  ]);
  console.log("✅ Categories created:", categories.length);

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { code: "URN001" },
      update: {},
      create: {
        code: "URN001",
        name: "Karma Aşı (Köpek)",
        barcode: "8691234567890",
        unit: "Adet",
        purchasePrice: 150,
        salePrice: 250,
        vatRate: 10,
        stock: 50,
        criticalLevel: 10,
        categoryId: categories[0].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "URN002" },
      update: {},
      create: {
        code: "URN002",
        name: "Kuduz Aşısı",
        barcode: "8691234567891",
        unit: "Adet",
        purchasePrice: 100,
        salePrice: 180,
        vatRate: 10,
        stock: 30,
        criticalLevel: 5,
        categoryId: categories[0].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "URN003" },
      update: {},
      create: {
        code: "URN003",
        name: "Antibiyotik Enjeksiyon",
        barcode: "8691234567892",
        unit: "Ampul",
        purchasePrice: 45,
        salePrice: 85,
        vatRate: 10,
        stock: 100,
        criticalLevel: 20,
        categoryId: categories[1].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "URN004" },
      update: {},
      create: {
        code: "URN004",
        name: "Premium Köpek Maması 15kg",
        barcode: "8691234567893",
        unit: "Paket",
        purchasePrice: 450,
        salePrice: 650,
        vatRate: 10,
        stock: 25,
        criticalLevel: 5,
        categoryId: categories[2].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "URN005" },
      update: {},
      create: {
        code: "URN005",
        name: "Kedi Taşıma Çantası",
        barcode: "8691234567894",
        unit: "Adet",
        purchasePrice: 120,
        salePrice: 220,
        vatRate: 20,
        stock: 15,
        criticalLevel: 3,
        categoryId: categories[3].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "HZM001" },
      update: {},
      create: {
        code: "HZM001",
        name: "Muayene",
        unit: "Adet",
        purchasePrice: 0,
        salePrice: 150,
        vatRate: 10,
        stock: 0,
        isService: true,
        categoryId: categories[4].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "HZM002" },
      update: {},
      create: {
        code: "HZM002",
        name: "Tırnak Kesimi",
        unit: "Adet",
        purchasePrice: 0,
        salePrice: 80,
        vatRate: 10,
        stock: 0,
        isService: true,
        categoryId: categories[4].id,
      },
    }),
    prisma.product.upsert({
      where: { code: "HZM003" },
      update: {},
      create: {
        code: "HZM003",
        name: "Banyo & Tıraş",
        unit: "Adet",
        purchasePrice: 0,
        salePrice: 250,
        vatRate: 10,
        stock: 0,
        isService: true,
        categoryId: categories[4].id,
      },
    }),
  ]);
  console.log("✅ Products created:", products.length);

  // Create customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { code: "MUS001" },
      update: {},
      create: {
        code: "MUS001",
        name: "Ahmet Yılmaz",
        phone: "0532 123 45 67",
        email: "ahmet@email.com",
        city: "İstanbul",
        district: "Kadıköy",
        address: "Caferağa Mah. Moda Cad. No:15",
      },
    }),
    prisma.customer.upsert({
      where: { code: "MUS002" },
      update: {},
      create: {
        code: "MUS002",
        name: "Fatma Demir",
        phone: "0533 234 56 78",
        email: "fatma@email.com",
        city: "İstanbul",
        district: "Beşiktaş",
        address: "Levent Mah. No:8",
      },
    }),
    prisma.customer.upsert({
      where: { code: "MUS003" },
      update: {},
      create: {
        code: "MUS003",
        name: "Mehmet Kaya",
        phone: "0534 345 67 89",
        city: "Ankara",
        district: "Çankaya",
      },
    }),
  ]);
  console.log("✅ Customers created:", customers.length);

  // Create animals
  const animals = await Promise.all([
    prisma.animal.upsert({
      where: { id: "animal-1" },
      update: {},
      create: {
        id: "animal-1",
        name: "Max",
        species: Species.DOG,
        breed: "Golden Retriever",
        gender: Gender.MALE,
        birthDate: new Date("2020-05-15"),
        color: "Altın Sarısı",
        weight: 32,
        chipNumber: "123456789012345",
        customerId: customers[0].id,
      },
    }),
    prisma.animal.upsert({
      where: { id: "animal-2" },
      update: {},
      create: {
        id: "animal-2",
        name: "Pamuk",
        species: Species.CAT,
        breed: "Van Kedisi",
        gender: Gender.FEMALE,
        birthDate: new Date("2021-03-20"),
        color: "Beyaz",
        weight: 4.5,
        customerId: customers[0].id,
      },
    }),
    prisma.animal.upsert({
      where: { id: "animal-3" },
      update: {},
      create: {
        id: "animal-3",
        name: "Boncuk",
        species: Species.DOG,
        breed: "Pomeranian",
        gender: Gender.FEMALE,
        birthDate: new Date("2022-01-10"),
        color: "Turuncu",
        weight: 3.2,
        customerId: customers[1].id,
      },
    }),
    prisma.animal.upsert({
      where: { id: "animal-4" },
      update: {},
      create: {
        id: "animal-4",
        name: "Çiko",
        species: Species.BIRD,
        breed: "Sultan Papağanı",
        gender: Gender.MALE,
        birthDate: new Date("2023-06-01"),
        color: "Gri-Sarı",
        customerId: customers[2].id,
      },
    }),
  ]);
  console.log("✅ Animals created:", animals.length);

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { code: "TDR001" },
      update: {},
      create: {
        code: "TDR001",
        name: "VetMed Tıbbi Malzeme",
        phone: "0212 123 45 67",
        email: "info@vetmed.com",
        city: "İstanbul",
        contactName: "Ali Vural",
        taxOffice: "Kadıköy",
        taxNumber: "1234567890",
      },
    }),
    prisma.supplier.upsert({
      where: { code: "TDR002" },
      update: {},
      create: {
        code: "TDR002",
        name: "PetFood Gıda",
        phone: "0216 234 56 78",
        email: "siparis@petfood.com",
        city: "İstanbul",
        contactName: "Zeynep Aktaş",
      },
    }),
  ]);
  console.log("✅ Suppliers created:", suppliers.length);

  // Create protocols
  const protocols = await Promise.all([
    prisma.protocol.upsert({
      where: { id: "protocol-vaccine-puppy" },
      update: {},
      create: {
        id: "protocol-vaccine-puppy",
        name: "Yavru Köpek Aşı Protokolü",
        type: ProtocolType.VACCINATION,
        species: [Species.DOG],
        description: "6 haftalıktan itibaren uygulanan standart aşı takvimi",
        steps: {
          create: [
            { name: "İlk Karma Aşı", dayOffset: 0, order: 1 },
            { name: "2. Karma Aşı", dayOffset: 21, order: 2 },
            { name: "3. Karma Aşı", dayOffset: 42, order: 3 },
            { name: "Kuduz Aşısı", dayOffset: 90, order: 4 },
            { name: "Yıllık Rapel", dayOffset: 365, order: 5 },
          ],
        },
      },
    }),
    prisma.protocol.upsert({
      where: { id: "protocol-vaccine-cat" },
      update: {},
      create: {
        id: "protocol-vaccine-cat",
        name: "Kedi Aşı Protokolü",
        type: ProtocolType.VACCINATION,
        species: [Species.CAT],
        description: "Yetişkin kedi standart aşı takvimi",
        steps: {
          create: [
            { name: "Üçlü Aşı", dayOffset: 0, order: 1 },
            { name: "Kuduz Aşısı", dayOffset: 21, order: 2 },
            { name: "Yıllık Rapel", dayOffset: 365, order: 3 },
          ],
        },
      },
    }),
    prisma.protocol.upsert({
      where: { id: "protocol-fertility-dog" },
      update: {},
      create: {
        id: "protocol-fertility-dog",
        name: "Köpek Üreme Takibi",
        type: ProtocolType.FERTILITY,
        species: [Species.DOG],
        description: "Kızgınlık ve çiftleşme takip protokolü",
        steps: {
          create: [
            { name: "Kızgınlık Tespiti", dayOffset: 0, order: 1 },
            { name: "Progesteron Testi 1", dayOffset: 5, order: 2 },
            { name: "Progesteron Testi 2", dayOffset: 7, order: 3 },
            { name: "Çiftleşme", dayOffset: 9, order: 4 },
            { name: "Gebelik Kontrolü", dayOffset: 30, order: 5 },
            { name: "Doğum Öncesi Kontrol", dayOffset: 58, order: 6 },
          ],
        },
      },
    }),
  ]);
  console.log("✅ Protocols created:", protocols.length);

  // Create sample transaction
  const transaction = await prisma.transaction.create({
    data: {
      code: "STS-000001",
      type: TransactionType.SALE,
      customerId: customers[0].id,
      animalId: animals[0].id,
      userId: admin.id,
      subtotal: 400,
      discount: 0,
      vatTotal: 40,
      total: 440,
      paidAmount: 440,
      paymentMethod: PaymentMethod.CASH,
      status: "PAID",
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 1,
            unitPrice: 250,
            vatRate: 10,
            discount: 0,
            total: 275,
          },
          {
            productId: products[5].id, // Muayene hizmeti
            quantity: 1,
            unitPrice: 150,
            vatRate: 10,
            discount: 0,
            total: 165,
          },
        ],
      },
    },
  });
  console.log("✅ Sample transaction created:", transaction.code);

  // Create reminders
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  await Promise.all([
    prisma.reminder.create({
      data: {
        userId: admin.id,
        type: ReminderType.VACCINATION,
        title: "Kuduz Aşısı Hatırlatması",
        description: "Max için kuduz aşısı zamanı geldi.",
        dueDate: tomorrow,
        animalId: animals[0].id,
        customerId: customers[0].id,
      },
    }),
    prisma.reminder.create({
      data: {
        userId: admin.id,
        type: ReminderType.CUSTOM,
        title: "Kontrol Muayenesi",
        description: "Pamuk için kontrol muayenesi.",
        dueDate: nextWeek,
        animalId: animals[1].id,
        customerId: customers[0].id,
      },
    }),
  ]);
  console.log("✅ Reminders created");

  console.log("");
  console.log("🎉 Database seeding completed!");
  console.log("");
  console.log("📧 Admin Login:");
  console.log("   Email: admin@optimusvet.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
