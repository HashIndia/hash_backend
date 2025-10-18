import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

async function checkProducts() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const products = await Product.find({}).limit(3);
    console.log(`Found ${products.length} products`);
    
    products.forEach((product, index) => {
      console.log(`\n--- Product ${index + 1} ---`);
      console.log('Name:', product.name);
      console.log('Has variants:', !!product.variants);
      console.log('Variants count:', product.variants?.length || 0);
      if (product.variants && product.variants.length > 0) {
        console.log('Sample variant:', product.variants[0]);
      }
      console.log('Stock:', product.stock);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProducts();
