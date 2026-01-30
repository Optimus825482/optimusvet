import * as XLSX from "xlsx";

console.log("=== EXCEL KOLON KONTROL ===\n");

// Read Excel files
const files = [
  { name: "musteri.xlsx", path: "D:\\VTCLN\\musteri.xlsx" },
  { name: "satis.xlsx", path: "D:\\VTCLN\\satis.xlsx" },
  { name: "satisdetay.xlsx", path: "D:\\VTCLN\\satisdetay.xlsx" },
  { name: "musteritahsilat.xlsx", path: "D:\\VTCLN\\musteritahsilat.xlsx" },
];

files.forEach((file) => {
  console.log(`\n${file.name}:`);
  const workbook = XLSX.readFile(file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`  Kolonlar: ${columns.join(", ")}`);
    console.log(`  İlk satır:`, data[0]);
  }
});
