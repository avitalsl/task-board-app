import { describe, it, expect } from 'vitest';

// Test the validation logic directly by extracting it
function validateParsedTask(data: unknown) {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim() === '') return null;
  if (typeof obj.points !== 'number' || obj.points < 1 || obj.points > 100) return null;
  if (obj.type !== 'required' && obj.type !== 'optional') return null;
  return {
    title: (obj.title as string).trim().slice(0, 60),
    description: typeof obj.description === 'string' ? (obj.description as string).trim().slice(0, 200) : '',
    points: Math.round(obj.points as number),
    type: obj.type as 'required' | 'optional',
  };
}

describe('AI task validation', () => {
  it('accepts valid required task', () => {
    const result = validateParsedTask({ title: 'Do dishes', description: 'Kitchen', points: 5, type: 'required' });
    expect(result).toEqual({ title: 'Do dishes', description: 'Kitchen', points: 5, type: 'required' });
  });

  it('accepts valid optional task', () => {
    const result = validateParsedTask({ title: 'Read book', points: 10, type: 'optional' });
    expect(result).toEqual({ title: 'Read book', description: '', points: 10, type: 'optional' });
  });

  it('rejects missing title', () => {
    expect(validateParsedTask({ points: 5, type: 'optional' })).toBeNull();
  });

  it('rejects empty title', () => {
    expect(validateParsedTask({ title: '  ', points: 5, type: 'optional' })).toBeNull();
  });

  it('rejects points below 1', () => {
    expect(validateParsedTask({ title: 'Test', points: 0, type: 'optional' })).toBeNull();
  });

  it('rejects points above 100', () => {
    expect(validateParsedTask({ title: 'Test', points: 101, type: 'optional' })).toBeNull();
  });

  it('rejects invalid type', () => {
    expect(validateParsedTask({ title: 'Test', points: 5, type: 'urgent' })).toBeNull();
  });

  it('rejects null', () => {
    expect(validateParsedTask(null)).toBeNull();
  });

  it('rejects non-object', () => {
    expect(validateParsedTask('hello')).toBeNull();
  });

  it('truncates long titles to 60 chars', () => {
    const longTitle = 'A'.repeat(80);
    const result = validateParsedTask({ title: longTitle, points: 5, type: 'optional' });
    expect(result!.title.length).toBe(60);
  });

  it('rounds decimal points', () => {
    const result = validateParsedTask({ title: 'Test', points: 7.6, type: 'optional' });
    expect(result!.points).toBe(8);
  });
});
