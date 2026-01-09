const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating event_options table...');

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
        if (err) {
            console.error('Migration failed:', err);
        } else {
            console.log('Migration successful: event_options table recreated with new schema.');
        }
    });

    db.run("DROP TABLE IF EXISTS event_notes");
    db.run(`CREATE TABLE IF NOT EXISTS event_notes (
      event_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      content TEXT,
      updated_at INTEGER,
      PRIMARY KEY (event_id, option_id)
    )`, (err) => {
        if (err) console.error(err);
        else console.log('event_notes table confirmed.');
    });
});

db.close();
