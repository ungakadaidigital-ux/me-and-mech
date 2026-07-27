import type { Request, Response } from 'express';
import { VoiceService } from './voice.service';
import { ValidationError } from '../../lib/errors';

export async function transcribeVoice(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    throw new ValidationError('audio file is required (multipart field name: "audio")');
  }
  const extension = file.mimetype.includes('wav') ? 'wav' : 'm4a';

  const service = new VoiceService(req.repos.voiceSessions);
  const result = await service.transcribeAndExtract(req.auth!.workshopId, file.buffer, extension);
  res.json({ success: true, data: result });
}
