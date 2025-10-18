import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

dotenv.config();

async function debugReviewData() {
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
    
    // Find delivered orders for this user
    const deliveredOrders = await Order.find({
      user: user._id,
      status: 'delivered'
    }).populate('items.product');
    
    console.log(`📦 Delivered orders: ${deliveredOrders.length}`);
    
    deliveredOrders.forEach((order, index) => {
      console.log(`\n  Order ${index + 1}: ${order._id}`);
      console.log(`    Status: ${order.status}`);
      order.items.forEach((item, itemIndex) => {
        console.log(`    Item ${itemIndex + 1}:`);
        console.log(`      Product ID: ${item.product?._id || 'MISSING'}`);
        console.log(`      Product Name: ${item.product?.name || item.name || 'MISSING'}`);
        console.log(`      Item Product Field: ${item.product || 'MISSING'}`);
      });
    });
    
    // Test the exact query that the backend uses
    console.log('\n🔍 Testing backend query...');
    if (deliveredOrders.length > 0) {
      const firstOrder = deliveredOrders[0];
      const firstItem = firstOrder.items[0];
      const productId = firstItem.product?._id;
      
      if (productId) {
        console.log(`\nTesting with Order ID: ${firstOrder._id}`);
        console.log(`Testing with Product ID: ${productId}`);
        
        const testQuery = await Order.findOne({
          _id: firstOrder._id,
          user: user._id,
          status: 'delivered',
          'items.product': productId
        });
        
        console.log(`Backend query result: ${testQuery ? 'FOUND' : 'NOT FOUND'}`);
        
        if (testQuery) {
          console.log('✅ The backend query would work for this order/product combo');
        } else {
          console.log('❌ The backend query failed - this explains the error');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugReviewData();
