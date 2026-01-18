const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { isForbiddenDbPath, resolveRealPath } = require('./delete_all_events_guard.cjs');

let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    try {
        Database = require(path.join(__dirname, '../server/node_modules/better-sqlite3'));
    } catch (e2) {
        console.error('Could not load better-sqlite3. Please ensure it is installed in server/node_modules.');
        process.exit(1);
    }
}

const args = process.argv.slice(2);
const dbArg = args.find((a) => a.startsWith('--db='));
const yesFlag = args.includes('--yes');

const defaultDbPath = path.resolve(__dirname, '../server/calendar.db');
const dbPath = dbArg ? dbArg.split('=')[1] : defaultDbPath;
const resolvedDbPath = resolveRealPath(dbPath);
const forbiddenRoot = path.resolve(__dirname, '../../Calendario/cal-ap');

if (isForbiddenDbPath(resolvedDbPath, forbiddenRoot)) {
    console.error(`Error: Refusing to delete data in ${forbiddenRoot}`);
    console.error('This script is restricted to the dev calendar-app database only.');
    process.exit(1);
}

if (!fs.existsSync(resolvedDbPath)) {
    console.error(`Error: Database not found at ${resolvedDbPath}`);
    process.exit(1);
}

const confirm = () => {
    if (yesFlag) return Promise.resolve(true);
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('This will permanently delete ALL events and event notes. Type DELETE to continue: ', (answer) => {
            rl.close();
            resolve(answer.trim() === 'DELETE');
        });
    });
};

let db;
try {
    db = new Database(resolvedDbPath);
} catch (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
}

const runDelete = () => {
    try {
        const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count || 0;
        const totalNotes = db.prepare('SELECT COUNT(*) as count FROM event_notes').get().count || 0;
        console.log(`Found ${totalEvents} events and ${totalNotes} event notes.`);

        const deleteNotes = db.prepare('DELETE FROM event_notes');
        const deleteEvents = db.prepare('DELETE FROM events');

        deleteNotes.run();
        deleteEvents.run();

        console.log(`✓ Deleted ${totalEvents} events and ${totalNotes} event notes.`);
        db.close();
        process.exit(0);
    } catch (err) {
        console.error('Error deleting events:', err.message);
        db.close();
        process.exit(1);
    }
};

confirm().then((ok) => {
    if (!ok) {
        console.log('Cancelled. No data was deleted.');
        db.close();
        process.exit(0);
    }
    runDelete();
});
