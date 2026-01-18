const path = require('path');
let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    try {
        Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));
    } catch (e2) {
        console.error('Could not load better-sqlite3. Please ensure it is installed in server/node_modules.');
        process.exit(1);
    }
}

const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new Database(dbPath);

console.log('Checking schema for event_options...');

try {
    const rows = db.prepare('PRAGMA table_info(event_options)').all();
    console.log('Columns found:', rows.map((r) => r.name).join(', '));

    const hasUserId = rows.some((r) => r.name === 'user_id');
    const hasOrderIndex = rows.some((r) => r.name === 'order_index');

    if (!hasUserId || !hasOrderIndex) {
        console.log('MISSING COLUMNS! Schema mismatch detected.');
    } else {
        console.log('Schema looks correct.');
    }
} finally {
    db.close();
}
