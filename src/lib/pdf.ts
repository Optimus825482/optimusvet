// PDF Generation utilities using html2canvas + jspdf
// Alternative approach for Next.js compatibility

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    taxOffice?: string;
  };
  clinic: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    taxOffice?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
  subTotal: number;
  discount: number;
  vatTotal: number;
  total: number;
  paidAmount: number;
  notes?: string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(val);

  const clinicDisplayName = data.clinic.name || "OPTIMUS VET";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; }
    .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #10b981; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .logo span { color: #1e293b; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 18px; font-weight: bold; color: #10b981; }
    .invoice-date { color: #64748b; margin-top: 5px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party-title { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 10px; }
    .party-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
    .party-details { color: #64748b; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .totals-row.grand { font-size: 16px; font-weight: bold; color: #10b981; border-top: 2px solid #10b981; margin-top: 10px; padding-top: 15px; }
    .notes { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .notes-title { font-weight: bold; margin-bottom: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="logo">${clinicDisplayName}</div>
        <div style="color: #64748b; margin-top: 5px; font-weight: 600;">Veteriner Kliniği</div>
        ${data.clinic.phone ? `<div style="color: #64748b; font-size: 11px; margin-top: 3px;">Tel: ${data.clinic.phone}</div>` : ""}
        ${data.clinic.address ? `<div style="color: #64748b; font-size: 11px; margin-top: 2px;">${data.clinic.address}</div>` : ""}
      </div>
      <div class="invoice-info">
        <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 6px;">Tarih: ${data.date}</div>
        <div style="font-size: 12px; color: #64748b; font-weight: 600;">Belge No: ${data.invoiceNumber}</div>
        ${data.dueDate ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Vade: ${data.dueDate}</div>` : ""}
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Sayın</div>
        <div class="party-name">${data.customer.name}</div>
        <div class="party-details">
          ${data.customer.phone ? `Tel: ${data.customer.phone}<br>` : ""}
          ${data.customer.email ? `E-posta: ${data.customer.email}<br>` : ""}
          ${data.customer.address ? `${data.customer.address}<br>` : ""}
          ${data.customer.taxOffice ? `VD: ${data.customer.taxOffice}` : ""}
          ${data.customer.taxId ? ` - VKN: ${data.customer.taxId}` : ""}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%">Ürün / Hizmet</th>
          <th class="text-right">Miktar</th>
          <th class="text-right">Birim Fiyat</th>
          <th class="text-right">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${data.items
          .map(
            (item) => `
          <tr>
            <td>${item.name}</td>
            <td class="text-right">${item.quantity} ${item.unit}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right">${formatCurrency(item.total)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span>Ara Toplam</span>
          <span>${formatCurrency(data.subTotal)}</span>
        </div>
        ${
          data.discount > 0
            ? `
        <div class="totals-row">
          <span>İndirim</span>
          <span>-${formatCurrency(data.discount)}</span>
        </div>
        `
            : ""
        }
        <div class="totals-row grand">
          <span>Genel Toplam</span>
          <span>${formatCurrency(data.total)}</span>
        </div>
        ${
          data.paidAmount > 0
            ? `
        <div class="totals-row">
          <span>Ödenen</span>
          <span>${formatCurrency(data.paidAmount)}</span>
        </div>
        <div class="totals-row">
          <span>Kalan</span>
          <span>${formatCurrency(data.total - data.paidAmount)}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>

    ${
      data.notes
        ? `
    <div class="notes">
      <div class="notes-title">Notlar</div>
      <div>${data.notes}</div>
    </div>
    `
        : ""
    }

    <div class="footer">
      © ${new Date().getFullYear()} ${clinicDisplayName.toUpperCase()} - Tüm hakları saklıdır.
    </div>
  </div>
</body>
</html>
  `;
}

export function printInvoice(data: InvoiceData) {
  const html = generateInvoiceHTML(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export function downloadInvoiceAsPDF(data: InvoiceData) {
  // For PDF download, we'll use print-to-PDF approach
  // or integrate with a PDF library in production
  printInvoice(data);
}

// Customer Statement Generator
export interface StatementData {
  customer: {
    name: string;
    code: string;
    phone?: string;
    email?: string;
  };
  clinic: {
    name: string;
    phone?: string;
    email?: string;
  };
  period: {
    start: string;
    end: string;
  };
  openingBalance: number;
  transactions: Array<{
    date: string;
    code: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closingBalance: number;
}

export function generateStatementHTML(data: StatementData): string {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(val);

  const clinicDisplayName = data.clinic.name || "OPTIMUS VET";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; }
    .statement { max-width: 800px; margin: 0 auto; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #10b981; }
    .logo { font-size: 22px; font-weight: bold; color: #10b981; }
    .logo span { color: #1e293b; }
    .title { font-size: 16px; margin-top: 10px; color: #64748b; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; }
    .info-group { }
    .info-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .info-value { font-weight: bold; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #10b981; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .debit { color: #ef4444; }
    .credit { color: #10b981; }
    .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
    .summary-box { background: #f1f5f9; padding: 15px 25px; border-radius: 8px; text-align: right; }
    .summary-label { font-size: 12px; color: #64748b; }
    .summary-value { font-size: 20px; font-weight: bold; color: #10b981; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px; }
  </style>
</head>
<body>
  <div class="statement">
    <div class="header">
      <div class="logo">${clinicDisplayName}</div>
      <div class="title">Müşteri Hesap Ekstresi</div>
    </div>

    <div class="info-row">
      <div class="info-group">
        <div class="info-label">Müşteri</div>
        <div class="info-value">${data.customer.name}</div>
        <div style="color: #64748b; font-size: 10px;">Kod: ${data.customer.code}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Dönem</div>
        <div class="info-value">${data.period.start} - ${data.period.end}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Açılış Bakiyesi</div>
        <div class="info-value">${formatCurrency(data.openingBalance)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Tarih</th>
          <th>İşlem Kodu</th>
          <th>Açıklama</th>
          <th class="text-right">Borç</th>
          <th class="text-right">Alacak</th>
          <th class="text-right">Bakiye</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="3"><em>Açılış Bakiyesi</em></td>
          <td></td>
          <td></td>
          <td class="text-right">${formatCurrency(data.openingBalance)}</td>
        </tr>
        ${data.transactions
          .map(
            (t) => `
          <tr>
            <td>${t.date}</td>
            <td>${t.code}</td>
            <td>${t.description}</td>
            <td class="text-right debit">${t.debit > 0 ? formatCurrency(t.debit) : ""}</td>
            <td class="text-right credit">${t.credit > 0 ? formatCurrency(t.credit) : ""}</td>
            <td class="text-right">${formatCurrency(t.balance)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-box">
        <div class="summary-label">Kapanış Bakiyesi</div>
        <div class="summary-value ${data.closingBalance > 0 ? "debit" : "credit"}">
          ${formatCurrency(Math.abs(data.closingBalance))}
          ${data.closingBalance > 0 ? "(Borç)" : data.closingBalance < 0 ? "(Alacak)" : ""}
        </div>
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} ${clinicDisplayName.toUpperCase()} - Tüm hakları saklıdır.
    </div>
  </div>
</body>
</html>
  `;
}

export function printStatement(data: StatementData) {
  const html = generateStatementHTML(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
