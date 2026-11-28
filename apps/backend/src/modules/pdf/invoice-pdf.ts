import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import { formatInr } from '@me-and-mech/shared';
import type { Workshop, Invoice, InvoiceLineItem } from '@me-and-mech/shared';

/**
 * PKG-046 — Tamil PDF Invoice Generation.
 *
 * Standard PDF libraries don't render Tamil Unicode without an embedded
 * font. The Noto Sans Tamil TTF files live in apps/backend/assets/fonts/
 * (NotoSansTamil-Regular.ttf and NotoSansTamil-Bold.ttf, SIL OFL 1.1).
 * PDFKit loads them lazily, so a missing file fails at the first PDF
 * generation, not at startup.
 *
 * Layout uses a manual y cursor, so page breaks must be handled explicitly:
 * every block calls ensureSpace() first. The footer is drawn on every page
 * at the very end (bufferPages) so it can never collide with content.
 */

const FONT_DIR = path.join(__dirname, '../../../assets/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'NotoSansTamil-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'NotoSansTamil-Bold.ttf');

const BRAND_ORANGE = '#FF6B00';
const TEXT_DARK = '#1A1A1A';
const FOOTER_RESERVE = 62; // points kept free at the bottom of every page for the footer

interface InvoicePdfInput {
  workshop: Workshop;
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
}

// Money is summed in integer paise, never floating-point rupees.
const toPaise = (value: string | number): number => Math.round(Number(value) * 100);
const fromPaise = (paise: number): string => (paise / 100).toFixed(2);

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const { workshop, invoice, lineItems, customerName, customerPhone, vehicleNumber } = input;

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.registerFont('Tamil', FONT_REGULAR);
  doc.registerFont('Tamil-Bold', FONT_BOLD);

  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  doc.pipe(stream);

  let y = 110;
  const col = { desc: 40, qty: 320, rate: 380, amount: 460 };

  const newPage = (): void => {
    doc.addPage();
    doc.fillColor(TEXT_DARK);
    y = 40;
  };

  /** Starts a new page if `needed` points don't fit. Returns true if it did. */
  const ensureSpace = (needed: number): boolean => {
    if (y + needed <= doc.page.height - FOOTER_RESERVE) return false;
    newPage();
    return true;
  };

  const drawTableHeader = (top: number): void => {
    doc.font('Tamil-Bold').fontSize(10).fillColor(TEXT_DARK);
    doc.text('விவரம்', col.desc, top);
    doc.text('எண்', col.qty, top);
    doc.text('விலை', col.rate, top);
    doc.text('தொகை', col.amount, top);
    doc.moveTo(40, top + 16).lineTo(555, top + 16).strokeColor('#E0E0E0').stroke();
  };

  // --- Header (page 1 only) ---
  doc.rect(0, 0, doc.page.width, 90).fill(BRAND_ORANGE);
  doc.fillColor('#FFFFFF').font('Tamil-Bold').fontSize(18).text(workshop.shopName, 40, 24);
  doc.font('Tamil').fontSize(10);
  doc.text(workshop.address ?? '', 40, 48);
  doc.text(`${workshop.phone}${workshop.gstNumber ? '  |  GST: ' + workshop.gstNumber : ''}`, 40, 64);

  doc.fillColor(TEXT_DARK);

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
  drawTableHeader(y);
  y += 24;

  let subtotalPaise = 0;
  lineItems.forEach((item, i) => {
    const amountPaise = toPaise(item.amount ?? Number(item.rate) * item.quantity);
    subtotalPaise += amountPaise;

    // Long descriptions wrap, so the row height follows the text height.
    doc.font('Tamil').fontSize(9);
    const rowHeight = Math.max(20, Math.ceil(doc.heightOfString(item.description, { width: 260 })) + 8);

    if (ensureSpace(rowHeight + 16)) {
      doc.font('Tamil').fontSize(8).fillColor('#999999');
      doc.text(`Invoice #: ${invoice.invoiceNumber} (தொடர்ச்சி)`, 40, y);
      doc.fillColor(TEXT_DARK);
      drawTableHeader(y + 16);
      y += 16 + 24;
    }

    if (i % 2 === 1) doc.rect(40, y - 4, 515, rowHeight).fill('#FAFAFA').fillColor(TEXT_DARK);
    doc.font('Tamil').fontSize(9);
    doc.text(item.description, col.desc, y, { width: 260 });
    doc.text(String(item.quantity), col.qty, y);
    doc.text(formatInr(item.rate), col.rate, y);
    doc.text(formatInr(fromPaise(amountPaise)), col.amount, y);
    y += rowHeight;
  });

  // --- Totals (kept together; GST rows only if the workshop has a GST number) ---
  const gstPaise = toPaise(invoice.gstAmount ?? 0);
  const showGst = Boolean(workshop.gstNumber) && gstPaise > 0;
  ensureSpace(10 + 12 + (showGst ? 48 : 0) + 30);

  y += 10;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#E0E0E0').stroke();
  y += 12;

  if (showGst) {
    const cgstPaise = Math.floor(gstPaise / 2);
    const sgstPaise = gstPaise - cgstPaise;
    doc.font('Tamil').fontSize(10);
    doc.text(`Subtotal: ${formatInr(fromPaise(subtotalPaise))}`, 400, y);
    y += 16;
    doc.text(`CGST (9%): ${formatInr(fromPaise(cgstPaise))}`, 400, y);
    y += 16;
    doc.text(`SGST (9%): ${formatInr(fromPaise(sgstPaise))}`, 400, y);
    y += 16;
  }

  const totalPaise = subtotalPaise + gstPaise;

  // Payment status badge on the same row as the grand total.
  const statusColor = invoice.paymentStatus === 'PAID' ? '#27AE60' : invoice.paymentStatus === 'PARTIALLY_PAID' ? '#3B82F6' : '#F39C12';
  const statusLabel = invoice.paymentStatus === 'PAID' ? 'PAID ✓' : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIALLY PAID' : 'PENDING';
  doc.rect(40, y - 2, 120, 24).fill(statusColor);
  doc.fillColor('#FFFFFF').font('Tamil-Bold').fontSize(11).text(statusLabel, 40, y + 4, { width: 120, align: 'center' });
  doc.fillColor(TEXT_DARK);

  doc.font('Tamil-Bold').fontSize(13);
  doc.text(`மொத்தம்: ${formatInr(fromPaise(totalPaise))}`, 380, y);
  y += 40;

  // --- UPI QR code — only if workshop.upiId is set ---
  if (workshop.upiId) {
    ensureSpace(130);
    const upiUri = `upi://pay?pa=${encodeURIComponent(workshop.upiId)}&pn=${encodeURIComponent(workshop.shopName)}&am=${fromPaise(totalPaise)}&cu=INR`;
    const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 120, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 400, y, { width: 100 });
    doc.font('Tamil').fontSize(9).fillColor(TEXT_DARK).text('UPI-ல் Scan செய்து செலுத்தவும்', 400, y + 104);
  }

  // --- Footer on every page (drawn last, with the bottom margin lifted so
  //     PDFKit never auto-adds a page for it) ---
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Tamil-Bold').fontSize(11).fillColor(BRAND_ORANGE)
      .text('நன்றி', 40, doc.page.height - 56, { align: 'center', width: 515 });
    doc.font('Tamil').fontSize(8).fillColor('#999999')
      .text(`Powered by Me & Mech  |  ${i + 1} / ${range.count}`, 40, doc.page.height - 40, { align: 'center', width: 515 });
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
