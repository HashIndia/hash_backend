// Email Service Test Script - Forgot Password Troubleshooting
import dotenv from 'dotenv';
import emailService from './services/emailService.js';

dotenv.config();

// Test email configuration
const testEmailService = async () => {
  console.log('🔍 Testing Email Service Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || '❌ NOT SET');
  console.log('SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
  console.log('SENDER_EMAIL:', process.env.SENDER_EMAIL || '❌ NOT SET');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');
  console.log();

  // Test connection
  console.log('🔌 Testing SMTP Connection...');
  try {
    await emailService.verifyConnection();
    console.log('✅ SMTP Connection: SUCCESS\n');
  } catch (error) {
    console.error('❌ SMTP Connection: FAILED');
    console.error('Error:', error.message);
    return;
  }

  // Test sending password reset email
  console.log('📧 Testing Password Reset Email...');
  const testUser = {
    name: 'Test User',
    email: process.env.SENDER_EMAIL // Send to yourself for testing
  };
  const testToken = 'test123456789abcdef'.repeat(2); // 64 char test token

  try {
    const result = await emailService.sendPasswordResetEmail(testUser, testToken);
    if (result.success) {
      console.log('✅ Password Reset Email: SENT SUCCESSFULLY');
      console.log('Message ID:', result.messageId);
      console.log('📧 Check your email:', testUser.email);
    } else {
      console.log('❌ Password Reset Email: FAILED');
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Password Reset Email: EXCEPTION');
    console.error('Error:', error.message);
  }
};

// Run the test
testEmailService().catch(console.error);
