import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';

dotenv.config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    const orders = await Order.find().populate('user').populate('items.product');
    
    console.log(`📦 Total orders in database: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log('\n📋 All orders:');
      orders.forEach((order, index) => {
        console.log(`  ${index + 1}. Order ID: ${order._id}`);
        console.log(`     User: ${order.user?.email || 'Unknown'}`);
        console.log(`     Status: ${order.status}`);
        console.log(`     Total: $${order.totalAmount}`);
        console.log(`     Items: ${order.items.length}`);
        order.items.forEach((item, itemIndex) => {
          console.log(`       ${itemIndex + 1}. ${item.product?.name || 'Unknown Product'} - ${item.status}`);
        });
        console.log('');
      });
    } else {
      console.log('\n⚠️ No orders found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

checkOrders();
