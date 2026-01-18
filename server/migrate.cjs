const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new Database(dbPath);

console.log('Migrating event_options table...');

try {
    db.exec("DROP TABLE IF EXISTS event_options");
    db.exec(`CREATE TABLE event_options (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT,
      is_enabled INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0
    )`);
    console.log('Migration successful: event_options table recreated with new schema.');

    db.exec("DROP TABLE IF EXISTS event_notes");
    db.exec(`CREATE TABLE IF NOT EXISTS event_notes (
      event_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      content TEXT,
      updated_at INTEGER,
      PRIMARY KEY (event_id, option_id)
    )`);
    console.log('event_notes table confirmed.');
} catch (err) {
    console.error('Migration failed:', err);
} finally {
    db.close();
}
