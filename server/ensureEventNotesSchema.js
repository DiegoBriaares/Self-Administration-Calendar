const ensureEventNotesSchema = (db, onDone = () => {}, logger = console) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='event_notes'", (err, row) => {
        if (err) {
            logger.error('Failed to check event_notes table:', err);
            onDone();
            return;
        }
        if (!row) {
            db.run(`CREATE TABLE IF NOT EXISTS event_notes (
                event_id TEXT NOT NULL,
                role_id TEXT NOT NULL,
                content TEXT,
                updated_at INTEGER,
                PRIMARY KEY (event_id, role_id)
            )`, (createErr) => {
                if (createErr) {
                    logger.error('Failed to create event_notes table:', createErr);
                }
                onDone();
            });
            return;
        }

        db.all('PRAGMA table_info(event_notes)', (colErr, columns) => {
            if (colErr) {
                logger.error('Failed to inspect event_notes schema:', colErr);
                onDone();
                return;
            }
            const columnNames = new Set(columns.map((col) => col.name));
            const hasEventId = columnNames.has('event_id');
            const hasRoleId = columnNames.has('role_id');
            const hasCompositePk = columns.some((col) => col.name === 'event_id' && col.pk === 1)
                && columns.some((col) => col.name === 'role_id' && col.pk === 2);

            if (!hasEventId || hasCompositePk) {
                onDone();
                return;
            }

            const contentSelect = columnNames.has('content') ? 'content' : "'' AS content";
            const updatedSelect = columnNames.has('updated_at') ? 'updated_at' : 'NULL AS updated_at';
            const roleSelect = hasRoleId ? 'role_id' : "'legacy' AS role_id";

            db.serialize(() => {
                db.run('ALTER TABLE event_notes RENAME TO event_notes_legacy');
                db.run(`CREATE TABLE IF NOT EXISTS event_notes (
                    event_id TEXT NOT NULL,
                    role_id TEXT NOT NULL,
                    content TEXT,
                    updated_at INTEGER,
                    PRIMARY KEY (event_id, role_id)
                )`);
                db.run(
                    `INSERT INTO event_notes (event_id, role_id, content, updated_at)
                     SELECT event_id, ${roleSelect}, ${contentSelect}, ${updatedSelect}
                     FROM event_notes_legacy`
                );
                db.run('DROP TABLE event_notes_legacy', (dropErr) => {
                    if (dropErr) {
                        logger.error('Failed to drop legacy event_notes table:', dropErr);
                    }
                    onDone();
                });
            });
        });
    });
};

module.exports = { ensureEventNotesSchema };
