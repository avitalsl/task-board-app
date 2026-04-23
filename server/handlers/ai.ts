import OpenAI, { toFile } from 'openai';
import type { HandlerResult } from './types.js';

interface ParsedTask {
  title: string;
  description: string;
  points: number;
  type: 'required' | 'optional';
}

const SYSTEM_PROMPT = `You are a task parser. The user will describe a task in natural language.
Extract the following fields and return ONLY valid JSON:
{
  "title": "short title (max 60 chars)",
  "description": "brief description (max 200 chars, empty string if not provided)",
  "points": <number 1-100, estimate difficulty/effort>,
  "type": "required" or "optional" (default to "optional" unless the user says it's mandatory/required/must-do)
}
Do not include any text outside the JSON object.`;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey });
}

function validateParsedTask(data: unknown): ParsedTask | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim() === '') return null;
  if (typeof obj.points !== 'number' || obj.points < 1 || obj.points > 100) return null;
  if (obj.type !== 'required' && obj.type !== 'optional') return null;
  return {
    title: obj.title.trim().slice(0, 60),
    description: typeof obj.description === 'string' ? obj.description.trim().slice(0, 200) : '',
    points: Math.round(obj.points),
    type: obj.type,
  };
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
    const file = await toFile(buffer, `recording.${ext}`, { type: mimeType || 'audio/webm' });
    const client = getClient();
    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    return { status: 200, body: { text: transcription.text } };
  } catch {
    return { status: 500, body: { error: 'Transcription failed. Please try again.' } };
  }
}
