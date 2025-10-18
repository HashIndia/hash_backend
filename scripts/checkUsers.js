import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const sampleUsers = await User.find({}).limit(5).select('name email phone createdAt');
      console.log('\n📋 Sample users:');
      sampleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.phone || 'No phone'} - Created: ${user.createdAt}`);
      });
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

checkUsers();
