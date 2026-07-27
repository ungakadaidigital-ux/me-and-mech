import { env } from '../config/env';
import { logger } from './logger';

export interface WatiSendResult {
  watiMessageId: string | null;
  success: boolean;
}

export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  variables: Array<{ key: string; value: string }>,
): Promise<WatiSendResult> {
  const response = await fetch(`${env.WATI_API_ENDPOINT}/api/v1/sendTemplateMessage?whatsappNumber=${phone.replace('+', '')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WATI_API_KEY}`,
    },
    body: JSON.stringify({ template_name: templateName, broadcast_name: templateName, parameters: variables }),
  });

  if (!response.ok) {
    logger.error({ status: response.status, templateName }, 'Wati send failed');
    return { watiMessageId: null, success: false };
  }

  const body = await response.json().catch(() => ({}));
  return { watiMessageId: body.id ?? null, success: true };
}
