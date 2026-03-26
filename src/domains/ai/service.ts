import OpenAI from 'openai';
import type { ParsedTask } from './types';

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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
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

export interface AIResult {
  success: boolean;
  task?: ParsedTask;
  error?: string;
}

export async function parseTaskFromText(input: string): Promise<AIResult> {
  if (!input.trim()) {
    return { success: false, error: 'Please enter a task description.' };
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
    if (!content) {
      return { success: false, error: 'No response from AI. Please try again.' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'AI returned invalid format. Please try again.' };
    }

    const task = validateParsedTask(parsed);
    if (!task) {
      return { success: false, error: 'AI output failed validation. Please try again.' };
    }

    return { success: true, task };
  } catch (err) {
    if (err instanceof Error && err.message.includes('API_KEY')) {
      return { success: false, error: 'OpenAI API key is not configured.' };
    }
    return { success: false, error: 'Failed to reach AI service. Check your connection.' };
  }
}
