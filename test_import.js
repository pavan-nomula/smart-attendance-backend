try {
    const User = require('./models/User');
    console.log('User model loaded');
} catch (err) {
    console.error('Failed to load User model:', err);
}
