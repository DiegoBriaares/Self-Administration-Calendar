const ensureUserAvatarSchema = (db, done) => {
    db.all('PRAGMA table_info(users)', (err, rows) => {
        if (err) {
            console.error('Failed to inspect users schema:', err.message);
            done?.();
            return;
        }
        const hasAvatar = rows.some((row) => row.name === 'avatar_url');
        if (hasAvatar) {
            done?.();
            return;
        }
        db.run('ALTER TABLE users ADD COLUMN avatar_url TEXT', (err) => {
            if (err) {
                console.error('Failed to add avatar_url column:', err.message);
            } else {
                console.log('Added avatar_url column to users table.');
            }
            done?.();
        });
    });
};

module.exports = { ensureUserAvatarSchema };
