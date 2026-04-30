import OpenAI, { toFile } from 'openai';
import type { HandlerResult } from './types.js';

interface ParsedTask {
  title: string;
  description: string;
  baseTimeMinutes: number;
  difficultyMultiplier: number;
  type: 'required' | 'optional';
}

const SYSTEM_PROMPT = `You are a task parser. The user will describe a task in natural language.
Extract the following fields and return ONLY valid JSON:
{
  "title": "short title (max 60 chars)",
  "description": "brief description (max 200 chars, empty string if not provided)",
  "baseTimeMinutes": <integer, estimated minutes to complete the task; pick from 5, 10, 15, 20, 30, 45, 60, 90, 120 — choose the closest fit>,
  "difficultyMultiplier": <1, 2, or 3; use 1 for routine/easy, 2 for moderately hard or unpleasant, 3 for significant mental/physical effort>,
  "type": "required" or "optional" (default to "optional" unless the user says it's mandatory/required/must-do)
}
Do not include any text outside the JSON object.`;

const ALLOWED_TIMES = new Set([5, 10, 15, 20, 30, 45, 60, 90, 120]);
const ALLOWED_DIFFICULTIES = new Set([1, 2, 3]);

function snapToAllowed(value: number, allowed: Set<number>, fallback: number): number {
  if (allowed.has(value)) return value;
  let best = fallback;
  let bestDelta = Infinity;
  for (const v of allowed) {
    const delta = Math.abs(v - value);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = v;
    }
  }
  return best;
}

function validateParsedTask(data: unknown): ParsedTask | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim() === '') return null;
  if (typeof obj.baseTimeMinutes !== 'number' || obj.baseTimeMinutes < 1 || obj.baseTimeMinutes > 480) return null;
  if (typeof obj.difficultyMultiplier !== 'number' || obj.difficultyMultiplier < 1 || obj.difficultyMultiplier > 5) return null;
  if (obj.type !== 'required' && obj.type !== 'optional') return null;
  return {
    title: obj.title.trim().slice(0, 60),
    description: typeof obj.description === 'string' ? obj.description.trim().slice(0, 200) : '',
    baseTimeMinutes: snapToAllowed(Math.round(obj.baseTimeMinutes), ALLOWED_TIMES, 15),
    difficultyMultiplier: snapToAllowed(Math.round(obj.difficultyMultiplier), ALLOWED_DIFFICULTIES, 1),
    type: obj.type,
  };
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey });
}

export async function parseTask(input: string): Promise<HandlerResult> {
  if (typeof input !== 'string' || !input.trim()) {
    return { status: 400, body: { error: 'Please enter a task description.' } };
  }
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input.trim() },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return { status: 502, body: { error: 'No response from AI. Please try again.' } };
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { status: 502, body: { error: 'AI returned invalid format. Please try again.' } };
    }
    const task = validateParsedTask(parsed);
    if (!task) return { status: 502, body: { error: 'AI output failed validation. Please try again.' } };
    return { status: 200, body: { task } };
  } catch {
    return { status: 500, body: { error: 'Failed to reach AI service. Check your connection.' } };
  }
}

// Bilingual seed for Whisper. Biases toward Hebrew + English without locking
// either out, and uses task-domain vocabulary so transcripts of short utterances
// like "call mom" or "לקנות חלב" stay in-domain.
const TRANSCRIBE_PROMPT =
  'task: לקנות חלב, call mom, finish report, לסיים דוח, send email, לכתוב מייל';

// Whisper occasionally misdetects language on short clips and returns text in
// an unrelated script (most often Chinese for Hebrew/English speakers). We
// allow ASCII, Hebrew, Latin-1/Latin Extended, and whitespace; anything else
// is treated as a misdetection and triggers a Hebrew-pinned retry.
function looksLikeWrongScript(text: string): boolean {
  // Allow ASCII, Latin-1 + Latin Extended, Hebrew, and whitespace.
  // Anything else (CJK, Cyrillic, Arabic, etc.) signals a Whisper language misdetection.
  return /[^\u0000-\u007F\u00A0-\u024F\u0590-\u05FF\s]/.test(text);
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string
): Promise<HandlerResult> {
  if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
    return { status: 400, body: { error: 'Missing audio' } };
  }
  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    const ext = mimeType && mimeType.includes('webm') ? 'webm' : 'mp3';
    const fileType = mimeType || 'audio/webm';
    const client = getClient();

    const firstAttempt = await client.audio.transcriptions.create({
      file: await toFile(buffer, `recording.${ext}`, { type: fileType }),
      model: 'whisper-1',
      prompt: TRANSCRIBE_PROMPT,
    });

    let text = firstAttempt.text;
    if (looksLikeWrongScript(text)) {
      console.warn('[transcribeAudio] suspicious script, retrying pinned to Hebrew. first result:', text);
      const retry = await client.audio.transcriptions.create({
        file: await toFile(buffer, `recording.${ext}`, { type: fileType }),
        model: 'whisper-1',
        language: 'he',
      });
      text = retry.text;
    }
    return { status: 200, body: { text } };
  } catch (err) {
    console.error('[transcribeAudio] failed:', err);
    return { status: 500, body: { error: 'Transcription failed. Please try again.' } };
  }
}
