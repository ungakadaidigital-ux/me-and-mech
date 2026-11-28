import { writeFileSync } from 'node:fs';
import { generateInvoicePdf } from '../src/modules/pdf/invoice-pdf';

// Developer smoke check: renders a Tamil-heavy invoice so a human can eyeball
// glyph shaping. Not part of the automated test suite.
(async () => {
  const words = [
    'என்ஜின் ஆயில் மாற்றம்',
    'பிரேக் பேட் (முன்பக்கம்)',
    'கிருஷ்ணசாமி சர்வீஸ் கட்டணம்',
    'ஸ்ரீ ராம் ஸ்பார்க் பிளக்',
    'க்ஷேத்ரா ஏர் ஃபில்டர்',
    'கொடுத்த முன்பணம் கழிவு',
    'சங்கிலி எண்ணெய் / chain lube',
  ];

  const lineItems = Array.from({ length: 24 }, (_, i) => ({
    description: `${i + 1}. ${words[i % words.length]}`,
    quantity: 1 + (i % 3),
    rate: '350.00',
    amount: String((1 + (i % 3)) * 350) + '.00',
  }));

  const pdf = await generateInvoicePdf({
    workshop: {
      shopName: 'ரமேஷ் ஆட்டோ சர்வீஸ்',
      address: '14, காந்தி நகர், அம்பத்தூர், சென்னை - 600053',
      phone: '9840012345',
      gstNumber: null,
      upiId: 'ramesh@upi',
    } as never,
    invoice: {
      invoiceNumber: 'MM-2026-0001',
      createdAt: new Date().toISOString(),
      paymentStatus: 'pending',
      gstAmount: '0.00',
    } as never,
    lineItems: lineItems as never,
    customerName: 'முருகன் கிருஷ்ணசாமி',
    customerPhone: '9840012345',
    vehicleNumber: 'TN09AB1234',
  });

  writeFileSync('/workspaces/me-and-mech/smoke-invoice.pdf', pdf);
  console.log('PDF bytes:', pdf.length);
})().catch((e) => {
  console.error('PDF FAILED:', e);
  process.exit(1);
});
