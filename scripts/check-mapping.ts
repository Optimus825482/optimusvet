import * as XLSX from 'xlsx';

console.log('=== MÜŞTERİ EXCEL KOLONLARI ===');
const musteriWorkbook = XLSX.readFile('D:\\VTCLN\\musteri.xlsx');
const musteriSheet = musteriWorkbook.Sheets[musteriWorkbook.SheetNames[0]];
const musteriData = XLSX.utils.sheet_to_json(musteriSheet, { header: 1 });
console.log('Kolonlar:', musteriData[0]);
console.log('İlk kayıt:', musteriData[1]);

console.log('\n=== ÜRÜN EXCEL KOLONLARI ===');
const urunWorkbook = XLSX.readFile('D:\\VTCLN\\urunler.xlsx');
const urunSheet = urunWorkbook.Sheets[urunWorkbook.SheetNames[0]];
const urunData = XLSX.utils.sheet_to_json(urunSheet, { header: 1 });
console.log('Kolonlar:', urunData[0]);
console.log('İlk kayıt:', urunData[1]);