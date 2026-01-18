const BetterSqlite3 = require('better-sqlite3');

const normalizeArgs = (args) => {
    const argList = Array.from(args);
    const last = argList[argList.length - 1];
    if (typeof last === 'function') {
        return { params: argList.slice(0, -1), cb: last };
    }
    return { params: argList, cb: undefined };
};

const createStatementWrapper = (stmt) => {
    return {
        run: (...args) => {
            const { params: normalized, cb: callback } = normalizeArgs(args);
            try {
                const info = stmt.run(...normalized);
                callback?.call(info, null);
                return info;
            } catch (err) {
                callback?.(err);
                return undefined;
            }
        },
        get: (...args) => {
            const { params: normalized, cb: callback } = normalizeArgs(args);
            try {
                const row = stmt.get(...normalized);
                callback?.(null, row);
                return row;
            } catch (err) {
                callback?.(err, undefined);
                return undefined;
            }
        },
        all: (...args) => {
            const { params: normalized, cb: callback } = normalizeArgs(args);
            try {
                const rows = stmt.all(...normalized);
                callback?.(null, rows);
                return rows;
            } catch (err) {
                callback?.(err, undefined);
                return undefined;
            }
        },
        finalize: (cb) => {
            cb?.(null);
        }
    };
};

const createDatabase = (dbPath, onOpen) => {
    let dbInstance;
    try {
        dbInstance = new BetterSqlite3(dbPath);
        onOpen?.(null);
    } catch (err) {
        onOpen?.(err);
        throw err;
    }

    return {
        run: (sql, ...args) => {
            const { params: normalized, cb: callback } = normalizeArgs(args);
            try {
                const info = dbInstance.prepare(sql).run(...normalized);
                callback?.call(info, null);
                return info;
            } catch (err) {
                callback?.(err);
                return undefined;
            }
        },
        get: (sql, ...args) => {
            const { params: normalized, cb: callback } = normalizeArgs(args);
            try {
                const row = dbInstance.prepare(sql).get(...normalized);
                callback?.(null, row);
                return row;
            } catch (err) {
                callback?.(err, undefined);
                return undefined;
            }
        },
        all: (sql, ...args) => {
            const { params: normalized, cb: callback } = normalizeArgs(args);
            try {
                const rows = dbInstance.prepare(sql).all(...normalized);
                callback?.(null, rows);
                return rows;
            } catch (err) {
                callback?.(err, undefined);
                return undefined;
            }
        },
        prepare: (sql) => createStatementWrapper(dbInstance.prepare(sql)),
        serialize: (fn) => {
            fn();
        },
        close: (cb) => {
            try {
                dbInstance.close();
                cb?.(null);
            } catch (err) {
                cb?.(err);
            }
        }
    };
};

module.exports = { createDatabase };
