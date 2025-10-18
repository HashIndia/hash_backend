import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

dotenv.config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);

const sampleProducts = [
  {
    name: 'Premium Cotton T-Shirt',
    slug: 'premium-cotton-t-shirt',
    description: 'Comfortable and stylish cotton t-shirt perfect for everyday wear. Made from 100% organic cotton with a modern fit.',
    price: 1299,
    category: 'clothing',
    subcategory: 't-shirts',
    brand: 'Hash Fashion',
    sku: 'HSH-TSH-001',
    stock: 50,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        alt: 'Premium Cotton T-Shirt',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1583743814966-8936f37f4ad2?w=500',
        alt: 'T-Shirt Back View',
        isPrimary: false
      }
    ],
    tags: ['cotton', 'casual', 'comfortable'],
    isFeatures: true,
    salePrice: 999,
    saleStartDate: new Date('2024-01-01'),
    saleEndDate: new Date('2025-12-31')
  },
  {
    name: 'Classic Denim Jeans',
    slug: 'classic-denim-jeans',
    description: 'High-quality denim jeans with a perfect fit. Durable construction and timeless style that never goes out of fashion.',
    price: 2499,
    category: 'clothing',
    subcategory: 'jeans',
    brand: 'Hash Denim',
    sku: 'HSH-JNS-002',
    stock: 30,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
        alt: 'Classic Denim Jeans',
        isPrimary: true
      }
    ],
    tags: ['denim', 'classic', 'durable'],
    isFeatures: true
  },
  {
    name: 'Casual Sneakers',
    slug: 'casual-sneakers',
    description: 'Comfortable and trendy sneakers perfect for daily activities. Lightweight design with excellent cushioning.',
    price: 3999,
    category: 'shoes',
    subcategory: 'sneakers',
    brand: 'Hash Shoes',
    sku: 'HSH-SNK-003',
    stock: 25,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500',
        alt: 'Casual Sneakers',
        isPrimary: true
      }
    ],
    tags: ['sneakers', 'casual', 'comfortable'],
    isFeatures: false
  },
  {
    name: 'Leather Crossbody Bag',
    slug: 'leather-crossbody-bag',
    description: 'Elegant leather crossbody bag perfect for work and travel. Multiple compartments for organized storage.',
    price: 4999,
    category: 'bags',
    subcategory: 'crossbody',
    brand: 'Hash Leather',
    sku: 'HSH-BAG-004',
    stock: 15,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        alt: 'Leather Crossbody Bag',
        isPrimary: true
      }
    ],
    tags: ['leather', 'crossbody', 'elegant'],
    isFeatures: true,
    salePrice: 3999,
    saleStartDate: new Date('2024-01-01'),
    saleEndDate: new Date('2025-12-31')
  },
  {
    name: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    description: 'High-quality wireless headphones with noise cancellation. Perfect for music lovers and professionals.',
    price: 7999,
    category: 'electronics',
    subcategory: 'headphones',
    brand: 'Hash Audio',
    sku: 'HSH-HDW-005',
    stock: 20,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        alt: 'Wireless Bluetooth Headphones',
        isPrimary: true
      }
    ],
    tags: ['wireless', 'bluetooth', 'audio'],
    isFeatures: false
  },
  {
    name: 'Organic Face Moisturizer',
    slug: 'organic-face-moisturizer',
    description: 'Natural face moisturizer with organic ingredients. Suitable for all skin types, provides 24-hour hydration.',
    price: 1899,
    category: 'beauty',
    subcategory: 'skincare',
    brand: 'Hash Beauty',
    sku: 'HSH-BCR-006',
    stock: 40,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
        alt: 'Organic Face Moisturizer',
        isPrimary: true
      }
    ],
    tags: ['organic', 'skincare', 'moisturizer'],
    isFeatures: true
  }
];

async function addSampleProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the entire products collection to remove any problematic indexes
    await mongoose.connection.db.dropCollection('products').catch(() => {
      console.log('Products collection does not exist or already dropped');
    });
    console.log('Dropped products collection');

    // Add sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`Added ${products.length} sample products`);

    console.log('Sample products added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample products:', error);
    process.exit(1);
  }
}

addSampleProducts();
