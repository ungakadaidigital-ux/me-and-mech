import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '../../config/env';
import { useAuthStore } from '../../store/auth.store';
import { ApiError } from '../client';

interface VoiceTranscribeResult {
  sessionId: string;
  transcript: string;
  confidence: number;
  extracted: {
    serviceItems: Array<{ description: string; amount: string | null }>;
    vehiclePlate: string | null;
    customerName: string | null;
    total: string | null;
    confidence: number;
  };
}

/**
 * Multipart upload needs a distinct path from apiRequest() (which
 * JSON.stringifies bodies) — FormData must be sent as-is with the
 * platform setting its own multipart boundary header.
 */
export function useVoiceTranscribe() {
  return useMutation({
    mutationFn: async (audioUri: string): Promise<VoiceTranscribeResult> => {
      const token = useAuthStore.getState().accessToken;
      const form = new FormData();
      form.append('audio', { uri: audioUri, name: 'audio.wav', type: 'audio/wav' } as any);

      const response = await fetch(`${API_BASE_URL}/api/v1/voice/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new ApiError(json?.error?.code ?? 'ERR_VOICE', json?.error?.message ?? 'Voice transcription failed', response.status);
      }
      return json.data;
    },
  });
}
