const fs = require('fs');
const path = require('path');

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

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

// Check if user exists and promote to admin
db.get('SELECT id, username, is_admin FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
        console.error('Error querying user:', err.message);
        db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr.message);
            process.exit(1);
        });
        return;
    }

    if (!user) {
        console.error(`Error: User '${username}' not found in database`);
        db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr.message);
            process.exit(1);
        });
        return;
    }

    if (user.is_admin === 1) {
        console.log(`User '${username}' is already an admin.`);
        db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr.message);
            process.exit(0);
        });
        return;
    }

    // Promote user to admin
    db.run('UPDATE users SET is_admin = 1 WHERE username = ?', [username], function (updateErr) {
        if (updateErr) {
            console.error('Error promoting user to admin:', updateErr.message);
            db.close((closeErr) => {
                if (closeErr) console.error('Error closing database:', closeErr.message);
                process.exit(1);
            });
            return;
        }

        if (this.changes === 0) {
            console.error(`Error: Failed to update user '${username}'`);
            db.close((closeErr) => {
                if (closeErr) console.error('Error closing database:', closeErr.message);
                process.exit(1);
            });
            return;
        }

        console.log(`✓ Successfully promoted '${username}' to admin!`);
        console.log(`  User ID: ${user.id}`);
        db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr.message);
            process.exit(0);
        });
    });
});
