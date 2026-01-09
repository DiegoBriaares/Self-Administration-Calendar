import { describe, expect, it } from 'vitest';
import { normalizePriority } from './priorityUtils';

describe('normalizePriority', () => {
    it('returns null for empty values', () => {
        expect(normalizePriority()).toBeNull();
        expect(normalizePriority(null)).toBeNull();
        expect(normalizePriority('')).toBeNull();
    });

    it('parses numeric input', () => {
        expect(normalizePriority(3)).toBe(3);
        expect(normalizePriority('4')).toBe(4);
        expect(normalizePriority('7.9')).toBe(7);
    });

    it('returns null for non-numeric input', () => {
        expect(normalizePriority('abc')).toBeNull();
    });
});
