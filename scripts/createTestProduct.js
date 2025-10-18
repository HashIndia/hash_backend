import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

async function createTestProductWithVariants() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Create a test product with variants
    const testProduct = new Product({
      name: 'Test T-Shirt with Variants',
      description: 'A test product with size and color variants for testing',
      price: 29.99,
      category: 'clothing',
      stock: 0, // Will be calculated from variants
      sku: `TEST-${Date.now()}`,
      variants: [
        {
          size: 'S',
          color: { name: 'Red', hex: '#FF0000' },
          stock: 5,
          price: 29.99,
          sku: 'TEST-S-RED'
        },
        {
          size: 'M',
          color: { name: 'Red', hex: '#FF0000' },
          stock: 3,
          price: 29.99,
          sku: 'TEST-M-RED'
        },
        {
          size: 'S',
          color: { name: 'Blue', hex: '#0000FF' },
          stock: 7,
          price: 29.99,
          sku: 'TEST-S-BLUE'
        },
        {
          size: 'M',
          color: { name: 'Blue', hex: '#0000FF' },
          stock: 4,
          price: 29.99,
          sku: 'TEST-M-BLUE'
        },
        {
          size: 'L',
          color: { name: 'Blue', hex: '#0000FF' },
          stock: 2,
          price: 29.99,
          sku: 'TEST-L-BLUE'
        }
      ],
      images: [
        {
          url: 'https://via.placeholder.com/400x400/FF0000/FFFFFF?text=Red+T-Shirt',
          alt: 'Red T-Shirt',
          isPrimary: true
        }
      ]
    });

    await testProduct.save();
    console.log('Test product created successfully!');
    console.log('Product ID:', testProduct._id);
    console.log('Total stock:', testProduct.totalStock);
    console.log('Available sizes:', testProduct.availableSizes);
    console.log('Available colors:', testProduct.availableColors);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestProductWithVariants();
