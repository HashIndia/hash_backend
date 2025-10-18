import mongoose from 'mongoose';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const checkUsersAndAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check users
    const userCount = await User.countDocuments();
    console.log(`\n👥 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find({}).select('name email phone createdAt');
      console.log('\n📋 All users:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.phone || 'No phone'}`);
      });
    }
    
    // Check admins
    const adminCount = await Admin.countDocuments();
    console.log(`\n👨‍💼 Total admins in database: ${adminCount}`);
    
    if (adminCount > 0) {
      const admins = await Admin.find({}).select('name email role createdAt');
      console.log('\n📋 All admins:');
      admins.forEach((admin, index) => {
        console.log(`  ${index + 1}. ${admin.name} (${admin.email}) - Role: ${admin.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkUsersAndAdmins();
