import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createDatabase } = require('./db');
const { updateUserProfile, getUserByIdentifier } = require('./profileStore');

let dbsToClose: Array<{ close: () => void }> = [];

const run = (db: any, sql: string, params: unknown[] = []) => {
    db.run(sql, params);
};

const closeDb = (db: any) => {
    db.close();
};

afterEach(() => {
    const closers = dbsToClose;
    dbsToClose = [];
    for (const db of closers) {
        closeDb(db);
    }
});

describe('profileStore', () => {
    it('updates and fetches by username when id is missing', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-profile-store-'));
        const dbPath = path.join(tmpDir, 'calendar.db');
        const db = createDatabase(dbPath, () => {});
        dbsToClose.push(db);

        run(db, 'CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT, avatar_url TEXT, preferences TEXT)');
        run(db, 'INSERT INTO users (id, username, password) VALUES (?, ?, ?)', ['user-1', 'mira', 'hash']);

        await new Promise<void>((resolve) => {
            updateUserProfile(
                db,
                { ids: [], usernames: ['mira'], avatarUrl: '/uploads/avatar.png', preferences: '{}', newUsername: 'mira' },
                () => resolve()
            );
        });

        const row = await new Promise<any>((resolve) => {
            getUserByIdentifier(db, { ids: [], usernames: ['mira'] }, (_err: any, result: any) => resolve(result));
        });

        expect(row).toBeTruthy();
        expect(row.username).toBe('mira');
        expect(row.avatar_url).toBe('/uploads/avatar.png');
    });
});
