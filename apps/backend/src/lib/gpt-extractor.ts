import { env } from '../config/env';
import { logger } from './logger';

/**
 * PKG-030 — locked system prompt, verbatim. Do not paraphrase or "improve"
 * this without re-testing extraction accuracy against real Tamil mechanic
 * speech patterns — small wording changes measurably shift GPT output.
 */
const SYSTEM_PROMPT = `You are a Tamil auto mechanic billing assistant. Extract structured
job card data from this Tamil/English voice transcript. Mechanics say:
- Vehicle plates like 'TN 09 AB 1234'
- Services like 'oil change', 'brake pad', 'tyre puncture'
- Prices like 'முன்னூறு ரூபாய்' (three hundred rupees)
Return ONLY valid JSON. Never guess amounts. Use null if uncertain.`;

export interface ExtractedJobCardData {
  serviceItems: Array<{ description: string; amount: string | null }>;
  vehiclePlate: string | null;
  customerName: string | null;
  total: string | null;
  confidence: number;
}

export async function extractJobCardFromTranscript(transcript: string): Promise<ExtractedJobCardData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    logger.error({ status: response.status }, 'GPT-4o-mini extraction failed');
    // Extraction failure degrades gracefully to an empty pre-fill, NOT a
    // hard error — the transcript itself is still shown to the mechanic
    // for manual entry. Voice pre-fill is an assist, not a requirement.
    return { serviceItems: [], vehiclePlate: null, customerName: null, total: null, confidence: 0 };
  }

  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content);
    return {
      serviceItems: parsed.serviceItems ?? [],
      vehiclePlate: parsed.vehiclePlate ?? null,
      customerName: parsed.customerName ?? null,
      total: parsed.total ?? null,
      confidence: parsed.confidence ?? 0.5,
    };
  } catch {
    return { serviceItems: [], vehiclePlate: null, customerName: null, total: null, confidence: 0 };
  }
}
