const normalizeList = (items) => (items || []).filter((item) => item !== null && item !== undefined && item !== '');

const buildWhereClause = (ids, usernames) => {
    const idList = normalizeList(ids);
    const usernameList = normalizeList(usernames);
    const clauses = [];
    const params = [];
    if (idList.length) {
        clauses.push(`id IN (${idList.map(() => '?').join(', ')})`);
        params.push(...idList);
    }
    if (usernameList.length) {
        clauses.push(`username IN (${usernameList.map(() => '?').join(', ')})`);
        params.push(...usernameList);
    }
    return { clause: clauses.length ? clauses.join(' OR ') : '1=0', params };
};

const updateUserProfile = (db, payload, cb) => {
    const { ids, usernames, avatarUrl, preferences, newUsername } = payload;
    const where = buildWhereClause(ids, usernames);
    db.run(
        `UPDATE users SET avatar_url = ?, preferences = ?, username = ? WHERE (${where.clause})`,
        [avatarUrl || null, preferences, newUsername, ...where.params],
        function (err) {
            cb?.(err, this);
        }
    );
};

const getUserByIdentifier = (db, payload, cb) => {
    const { ids, usernames } = payload;
    const where = buildWhereClause(ids, usernames);
    db.get(
        `SELECT id, username, avatar_url, preferences FROM users WHERE (${where.clause})`,
        where.params,
        cb
    );
};

module.exports = {
    updateUserProfile,
    getUserByIdentifier
};
