const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking schema for event_options...');

db.all('PRAGMA table_info(event_options)', (err, rows) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    console.log('Columns found:', rows.map(r => r.name).join(', '));

    const hasUserId = rows.some(r => r.name === 'user_id');
    const hasOrderIndex = rows.some(r => r.name === 'order_index');

    if (!hasUserId || !hasOrderIndex) {
        console.log('MISSING COLUMNS! Schema mismatch detected.');
    } else {
        console.log('Schema looks correct.');
    }
});
