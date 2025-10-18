import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Razorpay Test User
    const razorpayTestEmail = 'razorpay.test@hashdemo.com';
    const existingRazorpayUser = await User.findOne({ email: razorpayTestEmail });
    
    if (existingRazorpayUser) {
      console.log('\n=== RAZORPAY TEST USER ALREADY EXISTS ===');
      console.log('Email:', existingRazorpayUser.email);
      console.log('Password: RazorpayTest@2024');
      console.log('Phone:', existingRazorpayUser.phone);
      console.log('Status:', existingRazorpayUser.status);
      console.log('Verified:', existingRazorpayUser.isEmailVerified && existingRazorpayUser.isPhoneVerified);
    } else {
      // Create comprehensive test user for Razorpay verification
      const razorpayTestUser = await User.create({
        name: 'Razorpay Test User',
        email: razorpayTestEmail,
        password: 'RazorpayTest@2024',
        phone: '+919876543210',
        status: 'active',
        isEmailVerified: true,
        isPhoneVerified: true,
        addresses: [{
          line1: 'NITK Surathkal Campus',
          line2: 'Student Hostel Block',
          city: 'Mangalore',
          state: 'Karnataka',
          zip: '575025',
          country: 'India',
          isDefault: true
        }]
      });

      console.log('\n=== RAZORPAY TEST USER CREATED SUCCESSFULLY ===');
      console.log('Email:', razorpayTestUser.email);
      console.log('Password: RazorpayTest@2024');
      console.log('Phone:', razorpayTestUser.phone);
      console.log('Status:', razorpayTestUser.status);
      console.log('Address: NITK Surathkal Campus, Mangalore, Karnataka');
    }

    // Check if regular test users exist, create if not
    const existingUser = await User.findOne({ email: 'testuser@example.com' });
    if (!existingUser) {
      const testUser = await User.create({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        phone: '+1234567890',
        status: 'active',
        isPhoneVerified: true
      });
      console.log('\nRegular test user created:', testUser.email);
    }

    const existingUser2 = await User.findOne({ email: 'jane@example.com' });
    if (!existingUser2) {
      const testUser2 = await User.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        phone: '+1234567891',
        status: 'active',
        isPhoneVerified: false
      });
      console.log('Second test user created:', testUser2.email);
    }

    console.log('\n=== PROVIDE THESE CREDENTIALS TO RAZORPAY ===');
    console.log('Website: https://your-hash-website.vercel.app');
    console.log('Test Account Email: razorpay.test@hashdemo.com');
    console.log('Test Account Password: RazorpayTest@2024');
    console.log('Test Phone: +919876543210');
    console.log('===============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser();
