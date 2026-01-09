const fs = require('fs');
const path = require('path');
const readline = require('readline');

let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
} catch (e) {
    try {
        sqlite3 = require(path.join(__dirname, '../server/node_modules/sqlite3')).verbose();
    } catch (e2) {
        console.error('Could not load sqlite3. Please ensure it is installed in server/node_modules.');
        process.exit(1);
    }
}

const args = process.argv.slice(2);
const dbArg = args.find((a) => a.startsWith('--db='));
const yesFlag = args.includes('--yes');

const defaultDbPath = path.resolve(__dirname, '../server/calendar.db');
const dbPath = dbArg ? dbArg.split('=')[1] : defaultDbPath;
const resolvedDbPath = path.resolve(dbPath);
const forbiddenRoot = path.resolve(__dirname, '../../Calendario/cal-ap');

if (resolvedDbPath.startsWith(forbiddenRoot + path.sep)) {
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

const db = new sqlite3.Database(resolvedDbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

const runDelete = () => {
    db.serialize(() => {
        db.get('SELECT COUNT(*) as count FROM events', (countErr, row) => {
            if (countErr) {
                console.error('Error counting events:', countErr.message);
                db.close();
                process.exit(1);
            }
            const totalEvents = row ? row.count : 0;
            db.get('SELECT COUNT(*) as count FROM event_notes', (noteErr, noteRow) => {
                if (noteErr) {
                    console.error('Error counting event notes:', noteErr.message);
                    db.close();
                    process.exit(1);
                }
                const totalNotes = noteRow ? noteRow.count : 0;
                console.log(`Found ${totalEvents} events and ${totalNotes} event notes.`);

                db.run('DELETE FROM event_notes', (delNotesErr) => {
                    if (delNotesErr) {
                        console.error('Error deleting event notes:', delNotesErr.message);
                        db.close();
                        process.exit(1);
                    }
                    db.run('DELETE FROM events', function (delEventsErr) {
                        if (delEventsErr) {
                            console.error('Error deleting events:', delEventsErr.message);
                            db.close();
                            process.exit(1);
                        }
                        console.log(`✓ Deleted ${totalEvents} events and ${totalNotes} event notes.`);
                        db.close((closeErr) => {
                            if (closeErr) console.error('Error closing database:', closeErr.message);
                            process.exit(0);
                        });
                    });
                });
            });
        });
    });
};

confirm().then((ok) => {
    if (!ok) {
        console.log('Cancelled. No data was deleted.');
        db.close();
        process.exit(0);
    }
    runDelete();
});
