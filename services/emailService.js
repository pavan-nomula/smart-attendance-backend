/**
 * Mock Email Service for the Smart Attendance System
 * In a real production environment, this would use nodemailer or an API like SendGrid.
 */

const sendWelcomeEmail = async (email, name, password) => {
    console.log('--------------------------------------------');
    console.log(`📧 SENDING EMAIL TO: ${email}`);
    console.log(`Hi ${name},`);
    console.log(`Your account has been created by the administrator.`);
    console.log(`Your temporary password is: ${password}`);
    console.log(`Please login and change your password immediately.`);
    console.log('--------------------------------------------');
    return true;
};

const sendPasswordResetEmail = async (email, password) => {
    console.log('--------------------------------------------');
    console.log(`📧 PASSWORD RESET FOR: ${email}`);
    console.log(`Your password has been reset to: ${password}`);
    console.log('--------------------------------------------');
    return true;
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail
};
