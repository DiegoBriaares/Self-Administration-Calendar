const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const DEFAULT_ADMIN = 'admin';
const DEFAULT_PASSWORD = 'admin';

// Generate timestamp for unique release folder
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const releaseDirName = `release_${timestamp}`;
const targetDir = path.resolve(__dirname, '../../', releaseDirName); // Create sibling to plan-administration-management-system

// Paths
const generateScript = path.resolve(__dirname, 'generate_prod.cjs');

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Production Release Process...');
console.log(`Target Directory: ${targetDir}`);

try {
    // 1. Run generation script
    console.log('\n\x1b[33m%s\x1b[0m', '1. Generating fresh environment and database...');
    // We use node to run the other script, passing arguments
    const command = `node "${generateScript}" --target="${targetDir}" --admin=${DEFAULT_ADMIN} --password=${DEFAULT_PASSWORD}`;
    execSync(command, { stdio: 'inherit' });

    // 2. Install dependencies in target
    console.log('\n\x1b[33m%s\x1b[0m', '2. Installing dependencies in production build...');
    // We install ALL dependencies (including dev) so that 'npm start' (which uses vite) 
    // and 'npm run dev' work immediately in the new environment.
    console.log('Running npm install in target directory...');
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' });

    console.log('Running npm install --production in server directory...');
    execSync('npm install --production', { cwd: path.join(targetDir, 'server'), stdio: 'inherit' });

    // 3. Success Message
    console.log('\n\x1b[32m%s\x1b[0m', '✅ Release Created Successfully!');
    console.log('\nTo start the new environment:');
    console.log(`  cd ${targetDir}`);
    console.log('  npm start');
    console.log('\nDefault Admin Credentials:');
    console.log(`  Username: ${DEFAULT_ADMIN}`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log(`\nNew database ready at: ${path.join(targetDir, 'server/calendar.db')}`);

} catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Release Failed:');
    console.error(error.message);
    process.exit(1);
}
