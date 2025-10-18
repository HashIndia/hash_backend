import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testCustomerAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Simulate the exact query the API makes
    const query = {};
    
    console.log('\n🔍 Testing customer query...');
    console.log('Query:', query);
    
    const customers = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .limit(10)
      .skip(0)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    console.log('\n📊 Results:');
    console.log('Total users found:', total);
    console.log('Customers returned:', customers.length);
    
    console.log('\n👥 Customer details:');
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.email})`);
      console.log(`   Phone: ${customer.phone || 'N/A'}`);
      console.log(`   ID: ${customer._id}`);
      console.log(`   Created: ${customer.createdAt}`);
      console.log('');
    });

    // Test what the API would return
    const apiResponse = {
      status: 'success',
      results: customers.length,
      total,
      page: 1,
      totalPages: Math.ceil(total / 10) || 1,
      data: { customers }
    };

    console.log('\n📋 API Response structure:');
    console.log('Status:', apiResponse.status);
    console.log('Results:', apiResponse.results);
    console.log('Total:', apiResponse.total);
    console.log('Data customers length:', apiResponse.data.customers.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

testCustomerAPI();
