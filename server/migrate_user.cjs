const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating event_options table to USER-SPECIFIC schema...');

db.serialize(() => {
    db.run("DROP TABLE IF EXISTS event_options");

    db.run(`CREATE TABLE event_options (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT NOT NULL,
        color TEXT,
        is_enabled INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0
    )`, (err) => {
        if (err) console.error('Migration failed:', err);
        else console.log('Migration successful: event_options table recreated (USER).');
    });
});

db.close();
