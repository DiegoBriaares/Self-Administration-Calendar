const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
const targetDirArg = args.find(a => a.startsWith('--target='));
const adminUserArg = args.find(a => a.startsWith('--admin='));
const adminPassArg = args.find(a => a.startsWith('--password='));

if (!targetDirArg || !adminUserArg || !adminPassArg) {
    console.error('Usage: node generate_prod.js --target=<path> --admin=<username> --password=<password>');
    process.exit(1);
}

const targetDir = path.resolve(process.cwd(), targetDirArg.split('=')[1]);
const adminUser = adminUserArg.split('=')[1];
const adminPass = adminPassArg.split('=')[1];
const sourceDir = path.resolve(__dirname, '..');

console.log(`Generating production seed in: ${targetDir}`);
console.log(`Admin User: ${adminUser}`);

// 1. Create Target Directory
if (fs.existsSync(targetDir)) {
    console.error(`Error: Target directory ${targetDir} already exists.`);
    process.exit(1);
}
fs.mkdirSync(targetDir, { recursive: true });

// 2. Copy Files (excluding node_modules, .git, etc.)
const exclude = ['node_modules', '.git', '.DS_Store', 'dist', 'scripts'];
function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    fs.mkdirSync(dest, { recursive: true });

    for (let entry of entries) {
        if (exclude.includes(entry.name)) continue;
        if (entry.name.endsWith('.db') || entry.name.endsWith('.db-shm') || entry.name.endsWith('.db-wal')) continue;

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
console.log('Copying project files...');
copyDir(sourceDir, targetDir);

// 3. Initialize Database
const dbPath = path.join(targetDir, 'server', 'calendar.db');
console.log(`Initializing database at ${dbPath}...`);

// Ensure server dir exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// We need to run the schema creation. 
// Since we can't easily import the server code without running it, we'll replicate the schema creation here
// or use a simplified version for the seed.
// Ideally, we should use the server's init logic, but for a script, direct SQL is safer/easier.

db.serialize(() => {
    // Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar_url TEXT,
      preferences TEXT,
      is_admin INTEGER DEFAULT 0
    )`);

    // Events
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT NOT NULL,
      start_time TEXT,
      note TEXT,
      link TEXT
    )`);
    db.run('CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date)');

    // Friendships
    db.run(`CREATE TABLE IF NOT EXISTS friendships (
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      UNIQUE(user_a, user_b)
    )`);

    // App Config
    db.run(`CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Seed Config
    const defaults = {
        'app_title': 'AUREUM CALENDAR',
        'app_subtitle': 'Curate your own canvas, borrow a friend\'s atmosphere, and keep every session synchronized.',
        'console_title': 'Chronos Console'
    };
    const stmt = db.prepare('INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)');
    Object.entries(defaults).forEach(([key, value]) => {
        stmt.run(key, value);
    });
    stmt.finalize();

    // Create Admin User
    // We need bcrypt. Since we are running this script from the project root (presumably), 
    // we can try to require bcrypt from the project's node_modules.
    // However, the script is in /scripts, so we need to look in ../server/node_modules or ../node_modules
    let bcrypt;
    try {
        bcrypt = require(path.join(sourceDir, 'server', 'node_modules', 'bcrypt'));
    } catch (e) {
        try {
            bcrypt = require('bcrypt');
        } catch (e2) {
            console.error('Could not load bcrypt. Please run npm install in server directory first.');
            process.exit(1);
        }
    }

    const crypto = require('crypto');
    const hashedPassword = bcrypt.hashSync(adminPass, 10);
    const id = crypto.randomUUID();

    db.run('INSERT INTO users (id, username, password, is_admin) VALUES (?, ?, ?, 1)', [id, adminUser, hashedPassword], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log('Admin user already exists, updating password and admin status...');
                db.run('UPDATE users SET password = ?, is_admin = 1 WHERE username = ?', [hashedPassword, adminUser], (updateErr) => {
                    if (updateErr) {
                        console.error('Failed to update admin user:', updateErr.message);
                        db.close((closeErr) => {
                            if (closeErr) console.error('Error closing database:', closeErr.message);
                            process.exit(1);
                        });
                        return;
                    }
                    console.log('Admin user updated successfully.');
                    console.log('Production seed generation complete.');
                    db.close((closeErr) => {
                        if (closeErr) console.error('Error closing database:', closeErr.message);
                        process.exit(0);
                    });
                });
                return;
            }
            console.error('Failed to create admin user:', err.message);
            db.close((closeErr) => {
                if (closeErr) console.error('Error closing database:', closeErr.message);
                process.exit(1);
            });
            return;
        }
        console.log('Admin user created successfully.');
        console.log('Production seed generation complete.');
        db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr.message);
            process.exit(0);
        });
    });
});
