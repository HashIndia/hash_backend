import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Review from '../models/Review.js';
import User from '../models/User.js';

dotenv.config();

async function checkExistingReviews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: 'py.231cs243@nitk.edu.in' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`✅ User found: ${user._id}`);
    
    // Check for existing reviews by this user
    const existingReviews = await Review.find({ user: user._id }).populate('product');
    
    console.log(`📝 Existing reviews by user: ${existingReviews.length}`);
    
    if (existingReviews.length > 0) {
      existingReviews.forEach((review, index) => {
        console.log(`  Review ${index + 1}:`);
        console.log(`    Product: ${review.product?.name || 'Unknown'}`);
        console.log(`    Rating: ${review.rating}/5`);
        console.log(`    Comment: ${review.comment}`);
      });
    } else {
      console.log('✅ No existing reviews - user can write new reviews');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkExistingReviews();
