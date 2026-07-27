import { randomUUID } from 'node:crypto';
import { transcribeAudio } from '../../lib/sarvam';
import { extractJobCardFromTranscript } from '../../lib/gpt-extractor';
import { uploadTempAudio } from '../../lib/audio-storage';
import { VoiceSessionRepository } from './voice-session.repository';
import { logger } from '../../lib/logger';

/**
 * PKG-030 — Voice AI Module — Sarvam AI Integration.
 *
 * MVP scope: voice pre-fills form fields, mechanic reviews and confirms.
 * Auto-create without review is explicitly out of scope (Phase 2) — this
 * service never writes a job card directly; it only returns extracted data
 * for the mobile client to pre-fill and let the mechanic edit.
 */
export class VoiceService {
  constructor(private readonly voiceSessions: VoiceSessionRepository) {}

  async transcribeAndExtract(workshopId: string, audioBuffer: Buffer, extension: 'wav' | 'm4a') {
    const sessionId = randomUUID();

    // Step 1: upload audio (24h TTL — see audio-storage.ts)
    const audioPath = await uploadTempAudio(workshopId, sessionId, audioBuffer, extension);

    // Step 2: transcribe (Sarvam, retries handled internally)
    const mimeType = extension === 'wav' ? 'audio/wav' : 'audio/m4a';
    const { transcript, confidence } = await transcribeAudio(audioBuffer, mimeType);

    // Step 3: extract structured fields (GPT-4o-mini) — failure here
    // degrades gracefully, never blocks returning the raw transcript
    const extracted = await extractJobCardFromTranscript(transcript);

    // Step 4: log the session
    const session = await this.voiceSessions.create({
      workshop_id: workshopId,
      audio_storage_url: audioPath,
      transcript,
      confidence,
      engine: 'sarvam_saarika_v2',
    });

    logger.info({ sessionId: session.id, workshopId, confidence }, 'Voice transcription completed');

    return {
      sessionId: session.id,
      transcript,
      confidence,
      extracted,
    };
  }
}
