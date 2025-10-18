import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const checkAdmins = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all admins
    const admins = await Admin.find({});
    console.log(`\nFound ${admins.length} admin(s) in database:\n`);
    
    if (admins.length === 0) {
      console.log('No admins found in database.');
    } else {
      admins.forEach((admin, index) => {
        console.log(`Admin ${index + 1}:`);
        console.log(`  ID: ${admin._id}`);
        console.log(`  Name: ${admin.name}`);
        console.log(`  Email: ${admin.email}`);
        console.log(`  Role: ${admin.role}`);
        console.log(`  Status: ${admin.status}`);
        console.log(`  Has Password: ${!!admin.password}`);
        console.log(`  Password Length: ${admin.password?.length || 0}`);
        console.log(`  Created: ${admin.createdAt}`);
        console.log(`  Permissions: ${admin.permissions?.join(', ') || 'None'}`);
        console.log('---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking admins:', error);
    process.exit(1);
  }
};

checkAdmins();
