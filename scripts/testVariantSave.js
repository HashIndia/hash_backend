import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

async function testVariantSave() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Test creating a product with variants directly
    const testData = {
      name: 'Backend Test Product',
      description: 'Testing variant save from backend',
      price: 25.99,
      category: 'clothing',
      stock: 0,
      sku: `TEST-BACKEND-${Date.now()}`,
      variants: [
        {
          size: 'M',
          color: {
            name: 'Green',
            hex: '#00FF00'
          },
          stock: 3,
          price: 25.99,
          sku: 'TEST-M-GREEN'
        }
      ]
    };

    console.log('Attempting to save product with data:', JSON.stringify(testData, null, 2));

    const product = await Product.create(testData);
    console.log('Product saved successfully!');
    console.log('Saved product ID:', product._id);
    console.log('Saved variants:', product.variants);
    console.log('Variants count:', product.variants?.length || 0);
    
    process.exit(0);
  } catch (error) {
    console.error('Error saving product:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    process.exit(1);
  }
}

testVariantSave();
