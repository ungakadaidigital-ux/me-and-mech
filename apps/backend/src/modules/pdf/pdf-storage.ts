import { getAdminClient } from '../../db/admin-client';
import { AppError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';

const BUCKET = 'invoices';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, per locked spec

/**
 * PKG-046 — permanent storage (unlike voice-sessions' 24h TTL), signed
 * URL regenerated fresh each time it's requested rather than stored
 * long-lived, since the underlying signed URL itself expires in 1hr.
 *
 * Bucket setup note: same as voice-sessions (PKG-030) — the `invoices`
 * bucket itself is a one-time dashboard/CLI setup, not a SQL migration.
 */
export async function uploadInvoicePdf(workshopId: string, invoiceId: string, pdfBuffer: Buffer): Promise<string> {
  const path = `${workshopId}/${invoiceId}.pdf`;
  const supabase = getAdminClient();

  const { error } = await supabase.storage.from(BUCKET).upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true });
  if (error) {
    throw new AppError(ErrorCode.INTERNAL, `Invoice PDF upload failed: ${error.message}`, 500);
  }

  return path;
}

export async function getSignedInvoicePdfUrl(storagePath: string): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    throw new AppError(ErrorCode.INTERNAL, `Failed to generate invoice PDF link: ${error?.message}`, 500);
  }
  return data.signedUrl;
}
