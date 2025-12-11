const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'da_vinci_secret_key'; // In prod, use env var

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Database Setup
const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDbOnce();
    }
});

let hasInitializedDb = false;
function initDbOnce(onReady) {
    if (hasInitializedDb) {
        onReady?.();
        return;
    }
    hasInitializedDb = true;
    initDb(onReady);
}

function initDb(onReady) {
    db.serialize(() => {
        // Base tables
        db.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT NOT NULL,
      start_time TEXT,
      note TEXT,
      link TEXT
    )`);

        db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar_url TEXT,
      preferences TEXT
    )`);

        migrateEventsSchemaIfNeeded(onReady);
    });
}

function migrateEventsSchemaIfNeeded(onReady) {
    db.all('PRAGMA table_info(events)', (err, rows) => {
        if (err) {
            console.error('Error inspecting events schema:', err.message);
            onReady?.();
            return;
        }
        const hasUserId = rows.some((row) => row.name === 'user_id');
        const hasStartTime = rows.some((row) => row.name === 'start_time');
        const hasNote = rows.some((row) => row.name === 'note');
        const hasLink = rows.some((row) => row.name === 'link');

        const ensureIndex = () => {
            db.run('CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date)', (idxErr) => {
                if (idxErr) {
                    console.error('Error ensuring events index:', idxErr.message);
                }
                ensureFriendshipsTable(onReady);
            });
        };

        // If core schema present, but missing optional cols, add them
        if (hasUserId && (!hasStartTime || !hasNote || !hasLink)) {
            db.serialize(() => {
                if (!hasStartTime) {
                    db.run('ALTER TABLE events ADD COLUMN start_time TEXT', (e1) => {
                        if (e1) console.error('Error adding start_time:', e1.message);
                    });
                }
                if (!hasNote) {
                    db.run('ALTER TABLE events ADD COLUMN note TEXT', (e2) => {
                        if (e2) console.error('Error adding note:', e2.message);
                    });
                }
                if (!hasLink) {
                    db.run('ALTER TABLE events ADD COLUMN link TEXT', (e3) => {
                        if (e3) console.error('Error adding link:', e3.message);
                    });
                }
                ensureIndex();
            });
            return;
        }

        if (hasUserId) {
            ensureIndex();
            return;
        }

        console.warn('events table missing user_id; migrating existing data');
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run(`CREATE TABLE IF NOT EXISTS events_new (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'legacy'
      )`);
            db.run('INSERT INTO events_new (id, title, date) SELECT id, title, date FROM events');
            db.run('DROP TABLE events');
            db.run('ALTER TABLE events_new RENAME TO events');
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    console.error('Migration commit failed:', commitErr.message);
                } else {
                    console.log('Migration complete: events table now has user_id column');
                }
                ensureIndex();
            });
        });
    });
}

function ensureFriendshipsTable(onReady) {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS friendships (
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      UNIQUE(user_a, user_b)
    )`, (err) => {
            if (err) {
                console.error('Error creating friendships table:', err.message);
            }
            ensureUserPrefs(onReady);
        });
    });
}

function ensureUserPrefs(onReady) {
    db.all('PRAGMA table_info(users)', (err, rows) => {
        if (err) {
            console.error('Error inspecting users schema:', err.message);
            onReady?.();
            return;
        }
        const hasPreferences = rows.some((r) => r.name === 'preferences');
        if (hasPreferences) {
            onReady?.();
            return;
        }
        console.warn('users table missing preferences; migrating');
        db.serialize(() => {
            db.run('ALTER TABLE users ADD COLUMN preferences TEXT', (alterErr) => {
                if (alterErr) {
                    console.error('Error adding preferences column:', alterErr.message);
                } else {
                    console.log('Migration complete: users table now has preferences column');
                }
                onReady?.();
            });
        });
    });
}

// Auth Routes
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Invalid payload' });
    const trimmedUser = username.trim();
    if (!trimmedUser || password.length < 4) return res.status(400).json({ error: 'Username required; password must be at least 4 chars' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();

        const stmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
        stmt.run(id, trimmedUser, hashedPassword, function (err) { // Use function() for 'this' context
            if (err) {
                // Check for unique constraint error
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                console.error('Error inserting user:', err.message);
                return res.status(500).json({ error: 'Server error during registration' });
            }
            const token = jwt.sign({ id, username: trimmedUser }, SECRET_KEY);
            res.status(201).json({ message: 'success', token, user: { id, username: trimmedUser } });
        });
        stmt.finalize();
    } catch (e) {
        console.error('Error during registration:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Error fetching user for login:', err.message);
            return res.status(500).json({ error: 'Server error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
            res.json({ message: 'success', token, user: { id: user.id, username: user.username } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
};

// Routes

// Protect all event routes
app.use('/events', authenticateToken);

// GET /events - Fetch events for current user
app.get('/events', (req, res) => {
    const sql = 'SELECT id, title, date, start_time as startTime, note, link FROM events WHERE user_id = ? ORDER BY date';
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// POST /events - Add new events (bulk) for current user
app.post('/events', (req, res) => {
    const events = req.body.events; // Expecting array of { id?, title, date }

    if (!events || !Array.isArray(events)) {
        res.status(400).json({ error: 'Invalid input: events array required' });
        return;
    }

    const stmt = db.prepare('INSERT INTO events (id, title, date, user_id, start_time, note, link) VALUES (?, ?, ?, ?, ?, ?, ?)');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        events.forEach(event => {
            if (!event.title || !event.date) {
                console.error('Invalid event payload skipped');
                return;
            }
            const eventId = event.id || crypto.randomUUID();
            const cleanTime = event.startTime && typeof event.startTime === 'string' && event.startTime.trim() !== '' ? event.startTime.trim() : null;
            const cleanNote = event.note && typeof event.note === 'string' && event.note.trim() !== '' ? event.note.trim() : null;
            const cleanLink = event.link && typeof event.link === 'string' && event.link.trim() !== '' ? event.link.trim() : null;
            stmt.run(eventId, event.title, event.date, req.user.id, cleanTime, cleanNote, cleanLink, (err) => {
                if (err) {
                    console.error('Error inserting event:', err.message);
                }
            });
        });

        db.run('COMMIT', (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'success', count: events.length });
        });
    });

    stmt.finalize();
});

// DELETE /events - Clear current user's events (for testing/reset)
app.delete('/events', (req, res) => {
    db.run('DELETE FROM events WHERE user_id = ?', [req.user.id], (err) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'deleted all events for user' });
    });
});

// Update single event
app.put('/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, date, startTime, note, link } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Missing title or date' });

    const cleanTime = startTime && typeof startTime === 'string' && startTime.trim() !== '' ? startTime.trim() : null;
    const cleanNote = note && typeof note === 'string' && note.trim() !== '' ? note.trim() : null;
    const cleanLink = link && typeof link === 'string' && link.trim() !== '' ? link.trim() : null;

    db.run(
        `UPDATE events SET title = ?, date = ?, start_time = ?, note = ?, link = ? WHERE id = ? AND user_id = ?`,
        [title, date, cleanTime, cleanNote, cleanLink, id, req.user.id],
        function (err) {
            if (err) {
                console.error('Error updating event:', err.message);
                return res.status(500).json({ error: 'Failed to update event' });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'Event not found' });
            res.json({ message: 'success' });
        }
    );
});

// Delete single event
app.delete('/events/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM events WHERE id = ? AND user_id = ?', [id, req.user.id], function (err) {
        if (err) {
            console.error('Error deleting event:', err.message);
            return res.status(500).json({ error: 'Failed to delete event' });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'success' });
    });
});

// Helper to check friendship
function isFriend(currentUserId, friendId, cb) {
    const [a, b] = friendId < currentUserId ? [friendId, currentUserId] : [currentUserId, friendId];
    db.get('SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?', [a, b], (err, row) => {
        if (err) return cb(err);
        cb(null, !!row);
    });
}

// Profile routes
app.get('/me', authenticateToken, (req, res) => {
    db.get('SELECT id, username, avatar_url, preferences FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Failed to load profile' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        let preferences = {};
        try {
            preferences = row.preferences ? JSON.parse(row.preferences) : {};
        } catch (e) {
            preferences = {};
        }
        res.json({
            message: 'success',
            data: { id: row.id, username: row.username, avatar_url: row.avatar_url, preferences }
        });
    });
});

app.put('/me', authenticateToken, (req, res) => {
    const { avatar_url, preferences } = req.body;
    let prefString = null;
    try {
        prefString = JSON.stringify(preferences || {});
    } catch (e) {
        return res.status(400).json({ error: 'Invalid preferences' });
    }

    db.run('UPDATE users SET avatar_url = ?, preferences = ? WHERE id = ?', [avatar_url || null, prefString, req.user.id], function (err) {
        if (err) {
            console.error('Error updating profile:', err.message);
            return res.status(500).json({ error: 'Failed to update profile' });
        }
        res.json({ message: 'success' });
    });
});

// Users directory (public list, requires auth)
app.get('/users', authenticateToken, (req, res) => {
    db.all('SELECT id, username, avatar_url FROM users WHERE id != ?', [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to load users' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// Friendships (per-user)
app.get('/friends', authenticateToken, (req, res) => {
    const sql = `
    SELECT 
      CASE WHEN user_a = ? THEN user_b ELSE user_a END as id,
      u.username,
      u.avatar_url
    FROM friendships
    JOIN users u ON u.id = CASE WHEN user_a = ? THEN user_b ELSE user_a END
    WHERE user_a = ? OR user_b = ?`;
    db.all(sql, [req.user.id, req.user.id, req.user.id, req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to load friends' });
        }
        res.json({ message: 'success', data: rows });
    });
});

app.post('/friends/:friendId', authenticateToken, (req, res) => {
    const friendId = req.params.friendId;
    if (!friendId) return res.status(400).json({ error: 'Missing friend id' });
    if (friendId === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    db.get('SELECT id FROM users WHERE id = ?', [friendId], (err, userRow) => {
        if (err) return res.status(500).json({ error: 'Lookup failed' });
        if (!userRow) return res.status(404).json({ error: 'User not found' });

        const [a, b] = friendId < req.user.id ? [friendId, req.user.id] : [req.user.id, friendId];
        db.run('INSERT OR IGNORE INTO friendships (user_a, user_b) VALUES (?, ?)', [a, b], (insertErr) => {
            if (insertErr) {
                console.error('Error creating friendship:', insertErr.message);
                return res.status(500).json({ error: 'Could not add friend' });
            }
            res.status(201).json({ message: 'success' });
        });
    });
});

app.delete('/friends/:friendId', authenticateToken, (req, res) => {
    const friendId = req.params.friendId;
    if (!friendId) return res.status(400).json({ error: 'Missing friend id' });

    const [a, b] = friendId < req.user.id ? [friendId, req.user.id] : [req.user.id, friendId];
    db.run('DELETE FROM friendships WHERE user_a = ? AND user_b = ?', [a, b], function (err) {
        if (err) {
            console.error('Error removing friendship:', err.message);
            return res.status(500).json({ error: 'Could not remove friend' });
        }
        res.json({ message: 'success', removed: this.changes });
    });
});

// View a friend's calendar (read-only)
app.get('/friends/:friendId/events', authenticateToken, (req, res) => {
    const friendId = req.params.friendId;
    if (!friendId) return res.status(400).json({ error: 'Missing friend id' });
    if (friendId === req.user.id) return res.status(400).json({ error: 'Use /events for your own calendar' });

    db.get('SELECT id, username, preferences FROM users WHERE id = ?', [friendId], (userErr, friend) => {
        if (userErr) return res.status(500).json({ error: 'Lookup failed' });
        if (!friend) return res.status(404).json({ error: 'User not found' });

        isFriend(req.user.id, friendId, (err, ok) => {
            if (err) return res.status(500).json({ error: 'Friendship check failed' });
            if (!ok) return res.status(403).json({ error: 'Not friends' });

            db.all('SELECT id, title, date, start_time as startTime, note, link FROM events WHERE user_id = ? ORDER BY date', [friendId], (evErr, rows) => {
                if (evErr) return res.status(500).json({ error: 'Failed to load friend events' });
                let preferences = {};
                try {
                    preferences = friend.preferences ? JSON.parse(friend.preferences) : {};
                } catch (e) {
                    preferences = {};
                }
                res.json({ message: 'success', data: rows, friend: { id: friend.id, username: friend.username, preferences } });
            });
        });
    });
});

// Export for testing or embedding
module.exports = { app, db };

// Catch-all handler for any request that doesn't match the above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server only when DB is ready
if (require.main === module) {
    initDbOnce(() => {
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    });
}
