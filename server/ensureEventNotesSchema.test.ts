import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { ensureEventNotesSchema } = require('./ensureEventNotesSchema');

let dbsToClose: Array<{ close: () => void }> = [];

const getSqlite = () => {
    try {
        return require('better-sqlite3');
    } catch (err) {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        return require(path.join(__dirname, 'node_modules/better-sqlite3'));
    }
};

const run = (db: any, sql: string, params: unknown[] = []) => {
    db.prepare(sql).run(...params);
};

const all = (db: any, sql: string, params: unknown[] = []) => {
    return db.prepare(sql).all(...params);
};

const closeDb = (db: any) => {
    db.close();
};

afterEach(async () => {
    const closers = dbsToClose;
    dbsToClose = [];
    for (const db of closers) {
        closeDb(db);
    }
});

describe('ensureEventNotesSchema', () => {
    it('migrates legacy event_notes without losing rows', async () => {
        const Sqlite = getSqlite();
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-event-notes-'));
        const dbPath = path.join(tmpDir, 'calendar.db');
        const db = new Sqlite(dbPath);
        dbsToClose.push(db);

        run(db, 'CREATE TABLE event_notes (event_id TEXT PRIMARY KEY, content TEXT)');
        run(db, 'INSERT INTO event_notes (event_id, content) VALUES (?, ?)', ['event-1', 'Keep me']);

        await new Promise<void>((resolve) => ensureEventNotesSchema(db, resolve));

        const rows = all(db, 'SELECT * FROM event_notes');
        expect(rows).toHaveLength(1);
        expect(rows[0].event_id).toBe('event-1');
        expect(rows[0].role_id).toBe('legacy');
        expect(rows[0].content).toBe('Keep me');

        const columns = all(db, 'PRAGMA table_info(event_notes)');
        const pkColumns = columns.filter((col) => col.pk > 0).map((col) => col.name);
        expect(pkColumns).toEqual(['event_id', 'role_id']);
    });
});
