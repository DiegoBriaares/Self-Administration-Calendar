const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new Database(dbPath);

console.log('Migrating event_options table to GLOBAL schema...');

try {
    db.exec("DROP TABLE IF EXISTS event_options");
    db.exec(`CREATE TABLE event_options (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        color TEXT,
        description TEXT,
        is_enabled INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0
    )`);
    console.log('Migration successful: event_options table recreated (GLOBAL).');
} catch (err) {
    console.error('Migration failed:', err);
} finally {
    db.close();
}
