import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const fixAdminPassword = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the existing admin
    const admin = await Admin.findOne({ email: 'admin@hash.com' });
    
    if (!admin) {
      console.log('❌ No admin found with email admin@hash.com');
      process.exit(1);
    }

    console.log('📋 Found existing admin:', {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      hasPassword: !!admin.password
    });

    console.log('🔐 Generating new password hash...');
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    console.log('✅ Password hashed successfully');
    console.log('🔐 Hash length:', hashedPassword.length);

    // Use direct MongoDB update to bypass Mongoose validation
    console.log('🔄 Updating admin password directly in MongoDB...');
    
    const updateResult = await Admin.collection.updateOne(
      { _id: admin._id },
      { $set: { password: hashedPassword } }
    );

    console.log('📋 Update result:', updateResult);

    if (updateResult.modifiedCount === 1) {
      console.log('✅ Password updated successfully using direct MongoDB update');
    } else {
      console.log('❌ Direct MongoDB update failed');
      process.exit(1);
    }

    // Verify by fetching fresh from database
    const verifyAdmin = await Admin.findById(admin._id);
    console.log('✅ Verification - Admin found:', !!verifyAdmin);
    console.log('✅ Verification - Has password:', !!verifyAdmin.password);
    
    if (verifyAdmin.password) {
      console.log('✅ Verification - Password length:', verifyAdmin.password.length);

      // Test password comparison
      try {
        const testMatch = await bcrypt.compare('admin123', verifyAdmin.password);
        console.log('✅ Verification - Password test:', testMatch);
        
        if (testMatch) {
          console.log('🎉 Admin password setup complete! You can now login.');
          console.log('🔑 Login credentials:');
          console.log('   Email: admin@hash.com');
          console.log('   Password: admin123');
        } else {
          console.log('❌ Password test failed - password mismatch');
        }
      } catch (compareError) {
        console.error('❌ Password comparison test failed:', compareError.message);
      }
    } else {
      console.log('❌ No password found after update - trying to delete and recreate admin...');
      
      // Delete the problematic admin and create a new one
      await Admin.deleteOne({ _id: admin._id });
      console.log('🗑️ Deleted problematic admin');
      
      const newAdmin = new Admin({
        name: 'Hash Admin',
        email: 'admin@hash.com',
        password: hashedPassword,
        role: 'super_admin',
        permissions: ['products', 'orders', 'customers', 'analytics', 'settings'],
        status: 'active'
      });
      
      const savedAdmin = await newAdmin.save();
      console.log('✅ Created new admin:', savedAdmin._id);
      
      // Test the new admin
      const testMatch = await bcrypt.compare('admin123', savedAdmin.password);
      console.log('✅ New admin password test:', testMatch);
      
      if (testMatch) {
        console.log('🎉 New admin created successfully! You can now login.');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

fixAdminPassword();
