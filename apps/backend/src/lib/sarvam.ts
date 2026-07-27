import { env } from '../config/env';
import { VoiceTranscriptionError } from './errors';
import { logger } from './logger';

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

export interface SarvamTranscriptionResult {
  transcript: string;
  confidence: number;
}

/**
 * PKG-030 — Sarvam AI (Saarika v2) transcription. Retries 3x with
 * exponential backoff, 10s timeout per attempt. On final failure, throws
 * VoiceTranscriptionError — the mobile client's job is to fall back to
 * manual entry, not to retry indefinitely itself.
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<SarvamTranscriptionResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: mimeType }), 'audio');
      form.append('language_code', 'ta-IN');
      form.append('model', 'saarika:v2');

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: { 'api-subscription-key': env.SARVAM_API_KEY },
        body: form,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Sarvam API returned ${response.status}`);
      }

      const body = (await response.json()) as { transcript: string; confidence?: number };
      return { transcript: body.transcript, confidence: body.confidence ?? 0 };
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      logger.warn({ attempt, err: (err as Error).message }, 'Sarvam transcription attempt failed');
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500)); // exponential backoff
      }
    }
  }

  throw new VoiceTranscriptionError({ lastError: (lastError as Error)?.message });
}
