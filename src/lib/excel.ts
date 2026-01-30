import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
}

export function exportToExcel({
  filename,
  sheetName = "Sayfa1",
  columns,
  data,
}: ExportOptions) {
  // Prepare headers
  const headers = columns.map((col) => col.header);

  // Prepare rows
  const rows = data.map((item) => columns.map((col) => item[col.key] ?? ""));

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate and download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportProductsToExcel(products: any[]) {
  exportToExcel({
    filename: `urunler_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Ürünler",
    columns: [
      { header: "Kod", key: "code", width: 12 },
      { header: "Ürün Adı", key: "name", width: 30 },
      { header: "Barkod", key: "barcode", width: 15 },
      { header: "Birim", key: "unit", width: 10 },
      { header: "Alış Fiyatı", key: "purchasePrice", width: 12 },
      { header: "Satış Fiyatı", key: "salePrice", width: 12 },
      { header: "KDV %", key: "vatRate", width: 8 },
      { header: "Stok", key: "stock", width: 10 },
      { header: "Kritik Seviye", key: "criticalLevel", width: 12 },
    ],
    data: products,
  });
}

export function exportCustomersToExcel(customers: any[]) {
  exportToExcel({
    filename: `musteriler_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Müşteriler",
    columns: [
      { header: "Kod", key: "code", width: 12 },
      { header: "Ad Soyad", key: "name", width: 25 },
      { header: "Telefon", key: "phone", width: 15 },
      { header: "E-posta", key: "email", width: 25 },
      { header: "Şehir", key: "city", width: 15 },
      { header: "Bakiye", key: "balance", width: 12 },
      { header: "Hayvan Sayısı", key: "animalCount", width: 12 },
    ],
    data: customers.map((c) => ({
      ...c,
      animalCount: c._count?.animals ?? 0,
    })),
  });
}

export function exportSalesToExcel(sales: any[]) {
  exportToExcel({
    filename: `satislar_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Satışlar",
    columns: [
      { header: "İşlem Kodu", key: "code", width: 15 },
      { header: "Tarih", key: "date", width: 12 },
      { header: "Müşteri", key: "customer", width: 25 },
      { header: "Ara Toplam", key: "subtotal", width: 12 },
      { header: "İndirim", key: "discount", width: 10 },
      { header: "KDV", key: "vatTotal", width: 10 },
      { header: "Genel Toplam", key: "total", width: 12 },
      { header: "Ödenen", key: "paidAmount", width: 12 },
      { header: "Kalan", key: "remaining", width: 12 },
      { header: "Durum", key: "status", width: 12 },
    ],
    data: sales.map((s) => ({
      code: s.code,
      date: new Date(s.createdAt).toLocaleDateString("tr-TR"),
      customer: s.customer?.name ?? "Anonim",
      subtotal: s.subtotal,
      discount: s.discount,
      vatTotal: s.vatTotal,
      total: s.total,
      paidAmount: s.paidAmount,
      remaining: s.total - s.paidAmount,
      status:
        s.status === "PAID"
          ? "Tamamlandı"
          : s.status === "PENDING"
            ? "Bekliyor"
            : s.status,
    })),
  });
}

export function exportAnimalsToExcel(animals: any[]) {
  const speciesLabels: Record<string, string> = {
    DOG: "Köpek",
    CAT: "Kedi",
    BIRD: "Kuş",
    RABBIT: "Tavşan",
    FISH: "Balık",
    REPTILE: "Sürüngen",
    RODENT: "Kemirgen",
    HORSE: "At",
    CATTLE: "Sığır",
    SHEEP: "Koyun",
    GOAT: "Keçi",
    OTHER: "Diğer",
  };

  exportToExcel({
    filename: `hayvanlar_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Hayvanlar",
    columns: [
      { header: "Hayvan Adı", key: "name", width: 20 },
      { header: "Tür", key: "species", width: 12 },
      { header: "Irk", key: "breed", width: 20 },
      { header: "Cinsiyet", key: "gender", width: 10 },
      { header: "Doğum Tarihi", key: "birthDate", width: 12 },
      { header: "Renk", key: "color", width: 12 },
      { header: "Mikroçip", key: "microchip", width: 18 },
      { header: "Sahip", key: "owner", width: 25 },
      { header: "Telefon", key: "phone", width: 15 },
    ],
    data: animals.map((a) => ({
      name: a.name,
      species: speciesLabels[a.species] ?? a.species,
      breed: a.breed ?? "",
      gender:
        a.gender === "MALE"
          ? "Erkek"
          : a.gender === "FEMALE"
            ? "Dişi"
            : "Bilinmiyor",
      birthDate: a.birthDate
        ? new Date(a.birthDate).toLocaleDateString("tr-TR")
        : "",
      color: a.color ?? "",
      microchip: a.microchip ?? "",
      owner: a.customer?.name ?? "",
      phone: a.customer?.phone ?? "",
    })),
  });
}
