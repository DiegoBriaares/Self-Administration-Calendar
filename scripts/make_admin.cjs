const fs = require('fs');
const path = require('path');

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

// Parse arguments
const args = process.argv.slice(2);
const usernameArg = args.find(a => a.startsWith('--username='));

if (!usernameArg) {
    console.error('Usage: node make_admin.cjs --username=<username>');
    console.error('Example: node make_admin.cjs --username=diego');
    process.exit(1);
}

const username = usernameArg.split('=')[1];

if (!username || username.trim() === '') {
    console.error('Error: Username cannot be empty');
    process.exit(1);
}

// Connect to the database
const dbPath = path.resolve(__dirname, '../server/calendar.db');

if (!fs.existsSync(dbPath)) {
    console.error(`Error: Database not found at ${dbPath}`);
    process.exit(1);
}

console.log(`Connecting to database: ${dbPath}`);
console.log(`Promoting user '${username}' to admin...`);

let db;
try {
    db = new Database(dbPath);
} catch (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
}

try {
    const user = db.prepare('SELECT id, username, is_admin FROM users WHERE username = ?').get(username);
    if (!user) {
        console.error(`Error: User '${username}' not found in database`);
        db.close();
        process.exit(1);
    }

    if (user.is_admin === 1) {
        console.log(`User '${username}' is already an admin.`);
        db.close();
        process.exit(0);
    }

    const info = db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run(username);
    if (info.changes === 0) {
        console.error(`Error: Failed to update user '${username}'`);
        db.close();
        process.exit(1);
    }

    console.log(`✓ Successfully promoted '${username}' to admin!`);
    console.log(`  User ID: ${user.id}`);
    db.close();
    process.exit(0);
} catch (err) {
    console.error('Error promoting user to admin:', err.message);
    db.close();
    process.exit(1);
}
