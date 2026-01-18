import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { ensureUserAvatarSchema } = require('./ensureUserAvatarSchema');
const { createDatabase } = require('./db');

let dbsToClose: Array<{ close: () => void }> = [];

const run = (db: any, sql: string, params: unknown[] = []) => {
    db.run(sql, params);
};

const all = (db: any, sql: string, params: unknown[] = []) => {
    return db.all(sql, params);
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

describe('ensureUserAvatarSchema', () => {
    it('adds avatar_url when missing', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-users-avatar-'));
        const dbPath = path.join(tmpDir, 'calendar.db');
        const db = createDatabase(dbPath, () => {});
        dbsToClose.push(db);

        run(db, 'CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, password TEXT)');

        await new Promise<void>((resolve) => ensureUserAvatarSchema(db, resolve));

        const columns = all(db, 'PRAGMA table_info(users)');
        const columnNames = columns.map((col) => col.name);
        expect(columnNames).toContain('avatar_url');
    });

    it('no-ops when avatar_url already exists', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-users-avatar-exists-'));
        const dbPath = path.join(tmpDir, 'calendar.db');
        const db = createDatabase(dbPath, () => {});
        dbsToClose.push(db);

        run(db, 'CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, password TEXT, avatar_url TEXT)');

        await new Promise<void>((resolve) => ensureUserAvatarSchema(db, resolve));

        const columns = all(db, 'PRAGMA table_info(users)');
        const columnNames = columns.map((col) => col.name);
        expect(columnNames.filter((name) => name === 'avatar_url')).toHaveLength(1);
    });
});
