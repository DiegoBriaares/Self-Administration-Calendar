import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { isForbiddenDbPath } = require('./delete_all_events_guard.cjs');

describe('delete_all_events_guard', () => {
    it('blocks symlinked db paths that resolve under the forbidden root', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-guard-'));
        const forbiddenRoot = path.join(tempRoot, 'forbidden');
        const safeRoot = path.join(tempRoot, 'safe');
        fs.mkdirSync(forbiddenRoot);
        fs.mkdirSync(safeRoot);

        const forbiddenDb = path.join(forbiddenRoot, 'calendar.db');
        fs.writeFileSync(forbiddenDb, '');

        const safeDb = path.join(safeRoot, 'calendar.db');
        fs.writeFileSync(safeDb, '');

        const symlinkPath = path.join(tempRoot, 'link.db');
        fs.symlinkSync(forbiddenDb, symlinkPath);

        expect(isForbiddenDbPath(symlinkPath, forbiddenRoot)).toBe(true);
        expect(isForbiddenDbPath(safeDb, forbiddenRoot)).toBe(false);
    });
});
