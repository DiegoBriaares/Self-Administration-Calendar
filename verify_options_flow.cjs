const http = require('http');

// Configuration
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Helper method for requests
function request(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTest() {
    console.log(`Starting Event Options Verification on ${BASE_URL}...`);
    const username = `testuser_${Date.now()}`;
    const password = 'password123';

    try {
        // 1. Register
        console.log(`\n1. Registering user: ${username}`);
        const regRes = await request('POST', '/register', { username, password });
        if (regRes.status !== 200 && regRes.status !== 201) throw new Error(`Registration failed [${regRes.status}]: ${JSON.stringify(regRes.data)}`);
        const token = regRes.data.token;
        console.log('   -> Success. Token acquired.');

        // 2. Initial Fetch (Should be empty or default if any logic existed, but we expect empty for new user)
        console.log('\n2. Fetching options (expecting empty)');
        const initialFetch = await request('GET', '/event-options', null, token);
        if (initialFetch.data.data.length !== 0) throw new Error('New user should have 0 options');
        console.log('   -> Success. List empty.');

        // 3. Create Option 1
        console.log('\n3. Creating Option "Deep Work"');
        const opt1Res = await request('POST', '/event-options', { label: 'Deep Work', color: '#ff0000' }, token);
        const opt1Id = opt1Res.data.data.id;
        console.log(`   -> Created ID: ${opt1Id}`);

        // 4. Create Option 2
        console.log('\n4. Creating Option "Meeting"');
        const opt2Res = await request('POST', '/event-options', { label: 'Meeting', color: '#00ff00' }, token);
        const opt2Id = opt2Res.data.data.id;
        console.log(`   -> Created ID: ${opt2Id}`);

        // 5. Verify Fetch
        console.log('\n5. Verifying Fetch');
        const fetch2 = await request('GET', '/event-options', null, token);
        if (fetch2.data.data.length !== 2) throw new Error('Should have 2 options');
        console.log('   -> Success. 2 options found.');

        // 6. Reorder (Meeting first)
        console.log('\n6. Reordering');
        const reorderRes = await request('POST', '/event-options/reorder', { orderedIds: [opt2Id, opt1Id] }, token);
        if (reorderRes.status !== 200) throw new Error('Reorder failed');

        const fetch3 = await request('GET', '/event-options', null, token);
        if (fetch3.data.data[0].id !== opt2Id) throw new Error('Reorder did not apply');
        console.log('   -> Success. Order updated.');

        // 7. Update Option
        console.log('\n7. Updating Option "Deep Work" -> "Focus"');
        await request('PUT', `/event-options/${opt1Id}`, { label: 'Focus' }, token);
        const fetch4 = await request('GET', '/event-options', null, token);
        const updatedOpt = fetch4.data.data.find(o => o.id === opt1Id);
        if (updatedOpt.label !== 'Focus') throw new Error('Update failed');
        console.log('   -> Success. Label updated.');

        // 8. Delete Option
        console.log('\n8. Deleting Option "Meeting"');
        await request('DELETE', `/event-options/${opt2Id}`, null, token);
        const fetch5 = await request('GET', '/event-options', null, token);
        if (fetch5.data.data.length !== 1) throw new Error('Delete failed');
        console.log('   -> Success. Deleted.');

        console.log('\nPASSED: All Event Option tests passed successfully!');
    } catch (e) {
        console.error('\nFAILED:', e.message);
        process.exit(1);
    }
}

runTest();
