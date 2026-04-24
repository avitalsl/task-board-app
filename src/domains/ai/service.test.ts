import { describe, it, expect } from 'vitest';

// Test the validation logic directly by extracting it.
// Mirrors server/handlers/ai.ts#validateParsedTask.
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

function validateParsedTask(data: unknown) {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim() === '') return null;
  if (typeof obj.baseTimeMinutes !== 'number' || (obj.baseTimeMinutes as number) < 1 || (obj.baseTimeMinutes as number) > 480) return null;
  if (typeof obj.difficultyMultiplier !== 'number' || (obj.difficultyMultiplier as number) < 1 || (obj.difficultyMultiplier as number) > 5) return null;
  if (obj.type !== 'required' && obj.type !== 'optional') return null;
  return {
    title: (obj.title as string).trim().slice(0, 60),
    description: typeof obj.description === 'string' ? (obj.description as string).trim().slice(0, 200) : '',
    baseTimeMinutes: snapToAllowed(Math.round(obj.baseTimeMinutes as number), ALLOWED_TIMES, 15),
    difficultyMultiplier: snapToAllowed(Math.round(obj.difficultyMultiplier as number), ALLOWED_DIFFICULTIES, 1),
    type: obj.type as 'required' | 'optional',
  };
}

describe('AI task validation', () => {
  it('accepts valid required task', () => {
    const result = validateParsedTask({ title: 'Do dishes', description: 'Kitchen', baseTimeMinutes: 15, difficultyMultiplier: 1, type: 'required' });
    expect(result).toEqual({ title: 'Do dishes', description: 'Kitchen', baseTimeMinutes: 15, difficultyMultiplier: 1, type: 'required' });
  });

  it('accepts valid optional task', () => {
    const result = validateParsedTask({ title: 'Read book', baseTimeMinutes: 30, difficultyMultiplier: 2, type: 'optional' });
    expect(result).toEqual({ title: 'Read book', description: '', baseTimeMinutes: 30, difficultyMultiplier: 2, type: 'optional' });
  });

  it('rejects missing title', () => {
    expect(validateParsedTask({ baseTimeMinutes: 15, difficultyMultiplier: 1, type: 'optional' })).toBeNull();
  });

  it('rejects invalid type', () => {
    expect(validateParsedTask({ title: 'Test', baseTimeMinutes: 15, difficultyMultiplier: 1, type: 'urgent' })).toBeNull();
  });

  it('snaps a non-canonical baseTimeMinutes to the nearest allowed value', () => {
    const result = validateParsedTask({ title: 'Test', baseTimeMinutes: 18, difficultyMultiplier: 1, type: 'optional' });
    expect(result!.baseTimeMinutes).toBe(20);
  });

  it('snaps a non-canonical difficultyMultiplier to the nearest allowed value', () => {
    const result = validateParsedTask({ title: 'Test', baseTimeMinutes: 15, difficultyMultiplier: 4, type: 'optional' });
    expect(result!.difficultyMultiplier).toBe(3);
  });

  it('rejects baseTimeMinutes below 1', () => {
    expect(validateParsedTask({ title: 'Test', baseTimeMinutes: 0, difficultyMultiplier: 1, type: 'optional' })).toBeNull();
  });

  it('rejects null', () => {
    expect(validateParsedTask(null)).toBeNull();
  });
});
