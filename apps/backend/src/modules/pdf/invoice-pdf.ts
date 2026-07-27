import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import { formatInr } from '@me-and-mech/shared';
import type { Workshop, Invoice, InvoiceLineItem } from '@me-and-mech/shared';

/**
 * PKG-046 — Tamil PDF Invoice Generation.
 *
 * CRITICAL: standard PDF libraries don't render Tamil Unicode without an
 * embedded font — without this, Tamil characters render as blank boxes.
 * The Noto Sans Tamil TTF files must be present at
 * apps/backend/assets/fonts/NotoSansTamil-Regular.ttf and
 * apps/backend/assets/fonts/NotoSansTamil-Bold.ttf — NOT included in this
 * ZIP (binary font files, not source code). Download from Google Fonts
 * and place them there before this module can render Tamil text; it will
 * throw at startup if the files are missing (fail loud, not silent boxes).
 */

const FONT_DIR = path.join(__dirname, '../../../assets/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'NotoSansTamil-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'NotoSansTamil-Bold.ttf');

const BRAND_ORANGE = '#FF6B00';

interface InvoicePdfInput {
  workshop: Workshop;
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const { workshop, invoice, lineItems, customerName, customerPhone, vehicleNumber } = input;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.registerFont('Tamil', FONT_REGULAR);
  doc.registerFont('Tamil-Bold', FONT_BOLD);

  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  doc.pipe(stream);

  // --- Header (dark bg) ---
  doc.rect(0, 0, doc.page.width, 90).fill(BRAND_ORANGE);
  doc.fillColor('#FFFFFF').font('Tamil-Bold').fontSize(18).text(workshop.shopName, 40, 24);
  doc.font('Tamil').fontSize(10);
  doc.text(workshop.address ?? '', 40, 48);
  doc.text(`${workshop.phone}${workshop.gstNumber ? '  |  GST: ' + workshop.gstNumber : ''}`, 40, 64);

  doc.fillColor('#1A1A1A');
  let y = 110;

  // --- Bill To ---
  doc.font('Tamil-Bold').fontSize(11).text('Bill To', 40, y);
  y += 16;
  doc.font('Tamil').fontSize(10);
  doc.text(customerName, 40, y);
  y += 14;
  doc.text(customerPhone, 40, y);
  y += 14;
  doc.text(`Vehicle: ${vehicleNumber}`, 40, y);
  y += 14;
  doc.font('Tamil-Bold').text(`Invoice #: ${invoice.invoiceNumber}`, 300, y - 42);
  doc.font('Tamil').text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 300, y - 28);

  y += 20;

  // --- Line items table ---
  const tableTop = y;
  const col = { desc: 40, qty: 320, rate: 380, amount: 460 };
  doc.font('Tamil-Bold').fontSize(10);
  doc.text('விவரம்', col.desc, tableTop);
  doc.text('எண்', col.qty, tableTop);
  doc.text('விலை', col.rate, tableTop);
  doc.text('தொகை', col.amount, tableTop);
  doc.moveTo(40, tableTop + 16).lineTo(555, tableTop + 16).strokeColor('#E0E0E0').stroke();

  y = tableTop + 24;
  let subtotal = 0;
  lineItems.forEach((item, i) => {
    const amount = Number(item.amount ?? Number(item.rate) * item.quantity);
    subtotal += amount;
    if (i % 2 === 1) doc.rect(40, y - 4, 515, 20).fill('#FAFAFA').fillColor('#1A1A1A');
    doc.font('Tamil').fontSize(9);
    doc.text(item.description, col.desc, y, { width: 260 });
    doc.text(String(item.quantity), col.qty, y);
    doc.text(formatInr(item.rate), col.rate, y);
    doc.text(formatInr(String(amount)), col.amount, y);
    y += 20;
  });

  y += 10;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#E0E0E0').stroke();
  y += 12;

  // --- GST summary — only if the workshop has a GST number ---
  const gstAmount = Number(invoice.gstAmount ?? 0);
  if (workshop.gstNumber && gstAmount > 0) {
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    doc.font('Tamil').fontSize(10);
    doc.text(`Subtotal: ${formatInr(String(subtotal))}`, 400, y);
    y += 16;
    doc.text(`CGST (9%): ${formatInr(String(cgst))}`, 400, y);
    y += 16;
    doc.text(`SGST (9%): ${formatInr(String(sgst))}`, 400, y);
    y += 16;
  }

  doc.font('Tamil-Bold').fontSize(13);
  doc.text(`மொத்தம்: ${formatInr(String(subtotal + gstAmount))}`, 380, y);
  y += 30;

  // --- Payment status badge ---
  const statusColor = invoice.paymentStatus === 'PAID' ? '#27AE60' : invoice.paymentStatus === 'PARTIALLY_PAID' ? '#3B82F6' : '#F39C12';
  const statusLabel = invoice.paymentStatus === 'PAID' ? 'PAID ✓' : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIALLY PAID' : 'PENDING';
  doc.rect(40, y, 120, 24).fill(statusColor);
  doc.fillColor('#FFFFFF').font('Tamil-Bold').fontSize(11).text(statusLabel, 40, y + 6, { width: 120, align: 'center' });
  doc.fillColor('#1A1A1A');
  y += 40;

  // --- UPI QR code — only if workshop.upiId is set ---
  if (workshop.upiId) {
    const upiUri = `upi://pay?pa=${encodeURIComponent(workshop.upiId)}&pn=${encodeURIComponent(workshop.shopName)}&am=${subtotal + gstAmount}&cu=INR`;
    const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 120, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 400, y, { width: 100 });
    doc.font('Tamil').fontSize(9).text('UPI-ல் Scan செய்து செலுத்தவும்', 400, y + 104);
  }

  // --- Footer ---
  const footerY = doc.page.height - 60;
  doc.font('Tamil-Bold').fontSize(11).fillColor(BRAND_ORANGE).text('நன்றி', 40, footerY, { align: 'center', width: 515 });
  doc.font('Tamil').fontSize(8).fillColor('#999999').text('Powered by Me & Mech', 40, footerY + 16, { align: 'center', width: 515 });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
