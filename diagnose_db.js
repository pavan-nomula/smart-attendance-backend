const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function diagnose() {
    console.log('--- MongoDB Connection Diagnostics ---');
    console.log('URI found in .env:', uri ? 'Yes' : 'No');

    if (!uri) {
        console.error('Error: MONGODB_URI is missing in .env');
        process.exit(1);
    }

    const host = uri.split('@')[1]?.split('/')[0];
    console.log('Host to connect:', host);

    if (host) {
        console.log('Performing DNS lookup for host...');
        dns.lookup(host.split(':')[0], (err, address, family) => {
            if (err) {
                console.error('DNS Lookup failed:', err.message);
            } else {
                console.log(`DNS Lookup successful! Address: ${address}, Family: IPv${family}`);
            }
        });
    }

    console.log('\nAttempting to connect to MongoDB...');
    const start = Date.now();
    try {
        await mongoose.connect(uri, {
            connectTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000
        });
        console.log(`\n✅ SUCCESSFULLY CONNECTED to MongoDB Atlas in ${Date.now() - start}ms!`);
        await mongoose.connection.close();
    } catch (err) {
        console.error('\n❌ CONNECTION FAILED!');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);

        if (err.message.includes('IP not whitelisted')) {
            console.error('\nSUGGESTION: Your current IP address is not whitelisted in MongoDB Atlas.');
        } else if (err.name === 'MongooseServerSelectionError') {
            console.error('\nSUGGESTION: This usually means a network block (firewall) or the database server is unreachable.');
        }
    }
    process.exit(0);
}

diagnose();
