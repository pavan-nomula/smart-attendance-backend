const http = require('http');

const post = (url, data) => {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
};

const get = (url, token) => {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:4001/api';

const testLogin = async () => {
    try {
        console.log(`Testing Admin Login against ${BASE_URL}...`);
        const loginRes = await post(`${BASE_URL}/auth/login`, {
            email: 'admin@vishnu.edu.in',
            password: 'Admin@123'
        });

        console.log('Login Successful!');
        console.log('User Role:', loginRes.user.role);

        const token = loginRes.token;
        console.log('\nTesting Auth Me...');
        const meRes = await get(`${BASE_URL}/auth/me`, token);


        console.log('Auth Me Successful!');
        console.log('User ID from DB:', meRes._id);
        console.log('Name:', meRes.name);
        console.log('\nVerification Passed!');

    } catch (err) {
        console.error('Login Failed:', err.message);
        process.exit(1);
    }
};

testLogin();
