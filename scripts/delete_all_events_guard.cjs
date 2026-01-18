const fs = require('fs');
const path = require('path');

const resolveRealPath = (value) => {
    const resolved = path.resolve(value);
    if (!fs.existsSync(resolved)) return resolved;
    return fs.realpathSync(resolved);
};

const isForbiddenDbPath = (dbPath, forbiddenRoot) => {
    const resolvedDbRealPath = resolveRealPath(dbPath);
    const forbiddenRootRealPath = resolveRealPath(forbiddenRoot);
    return resolvedDbRealPath === forbiddenRootRealPath
        || resolvedDbRealPath.startsWith(forbiddenRootRealPath + path.sep);
};

module.exports = {
    isForbiddenDbPath,
    resolveRealPath
};
