import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

async function checkLatestProducts() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Get the latest 3 products
    const products = await Product.find({}).sort({ createdAt: -1 }).limit(3);
    console.log(`Found ${products.length} latest products\n`);
    
    products.forEach((product, index) => {
      console.log(`--- Latest Product ${index + 1} ---`);
      console.log('Name:', product.name);
      console.log('Created:', product.createdAt);
      console.log('Has variants:', !!product.variants);
      console.log('Variants count:', product.variants?.length || 0);
      console.log('Stock:', product.stock);
      if (product.variants && product.variants.length > 0) {
        console.log('Variants details:');
        product.variants.forEach((variant, vIndex) => {
          console.log(`  ${vIndex + 1}. Size: ${variant.size}, Color: ${variant.color?.name || 'N/A'} (${variant.color?.hex || 'N/A'}), Stock: ${variant.stock}`);
        });
      } else {
        console.log('No variants found');
      }
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLatestProducts();
