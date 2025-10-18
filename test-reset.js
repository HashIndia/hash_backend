// Reset Password Test Script
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from './models/User.js';

dotenv.config();

const testResetPassword = async () => {
  try {
    console.log('🔧 Testing Reset Password Functionality...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find a test user (you can modify this email)
    const testEmail = 'ggpppyadav@gmail.com'; // Replace with your email
    console.log('🔍 Looking for user:', testEmail);
    
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log('❌ User not found. Please register first or change the email.');
      return;
    }
    
    console.log('✅ User found:', user.name);
    
    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    console.log('🔑 Reset token generated:', resetToken);
    console.log('🔑 Token length:', resetToken.length);
    console.log('🕒 Token expires:', user.passwordResetExpires);
    
    // Test token hashing (what the backend does)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    console.log('🔐 Hashed token:', hashedToken);
    
    // Verify we can find the user with the hashed token
    const foundUser = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (foundUser) {
      console.log('✅ Token validation: SUCCESS');
      console.log('✅ User can be found with hashed token');
    } else {
      console.log('❌ Token validation: FAILED');
    }
    
    console.log('\n🔗 Test reset URL:', `https://www.hashindia.in/reset-password/${resetToken}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

testResetPassword();
