import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

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
      
      // Focus on delivered items for py.231cs243@nitk.edu.in
      const userOrders = orders.filter(order => order.user?.email === 'py.231cs243@nitk.edu.in');
      console.log(`\n🎯 Orders for py.231cs243@nitk.edu.in: ${userOrders.length}`);
      
      userOrders.forEach((order, index) => {
        console.log(`\n  Order ${index + 1}: ${order._id}`);
        order.items.forEach((item, itemIndex) => {
          console.log(`    Item ${itemIndex + 1}: ${item.product?.name || 'Unknown'} - Status: ${item.status}`);
          if (item.status === 'delivered') {
            console.log(`      ✅ DELIVERED - Can write review for Product ID: ${item.product?._id}`);
          }
        });
      });
      
    } else {
      console.log('\n⚠️ No orders found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkOrders();
