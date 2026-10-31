import { Invoice, InvoiceItem, Customer, Workspace } from '@prisma/client';

type PdfInvoice = Invoice & {
  customer: Customer;
  items: InvoiceItem[];
};

function pdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

export function createInvoicePdf(invoice: PdfInvoice, workspace: Workspace): Buffer {
  const lines = [
    workspace.companyName,
    workspace.address ?? '',
    `Billing email: ${workspace.billingEmail}`,
    '',
    `INVOICE ${invoice.invoiceNumber}`,
    `Status: ${invoice.status.toUpperCase()}`,
    `Issued: ${invoice.issueDate.toISOString().slice(0, 10)}    Due: ${invoice.dueDate.toISOString().slice(0, 10)}`,
    '',
    `Bill to: ${invoice.customer.name}`,
    invoice.customer.companyName ?? '',
    invoice.customer.email,
    '',
    'Description                         Qty        Unit price         Total',
    ...invoice.items.map((item) =>
      `${item.descriptionSnapshot.slice(0, 32).padEnd(34)} ${String(item.quantity).padStart(3)} ${item.unitPrice.toFixed(2).padStart(16)} ${item.lineTotal.toFixed(2).padStart(15)}`,
    ),
    '',
    `Subtotal: ${invoice.subtotal.toFixed(2)} ${invoice.currency}`,
    `Tax:      ${invoice.taxTotal.toFixed(2)} ${invoice.currency}`,
    `Total:    ${invoice.total.toFixed(2)} ${invoice.currency}`,
    invoice.notes ? `Notes: ${invoice.notes}` : '',
  ].filter(Boolean);

  const commands = ['BT', '/F1 11 Tf', '50 790 Td'];
  for (const [index, line] of lines.entries()) {
    if (index > 0) commands.push('0 -18 Td');
    commands.push(`(${pdfText(line)}) Tj`);
  }
  commands.push('ET');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
  ];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, 'ascii'));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, 'ascii');
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document, 'ascii');
}
