import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('D:\\VTCLN\\satisdetay.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== SATISDETAY.XLSX İLK 3 SATIR ===');
console.log(JSON.stringify(data.slice(0, 3), null, 2));