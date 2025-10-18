// Razorpay Test User Credentials
// Use these credentials for Razorpay verification

console.log('\n🎯 RAZORPAY TEST USER CREDENTIALS');
console.log('=====================================');
console.log('');
console.log('📧 Email: razorpay.test@hashdemo.com');
console.log('🔐 Password: RazorpayTest@2024');
console.log('📱 Phone: +919876543210');
console.log('👤 Name: Razorpay Test User');
console.log('');
console.log('📍 Address:');
console.log('   NITK Surathkal Campus');
console.log('   Student Hostel Block');
console.log('   Mangalore, Karnataka 575025');
console.log('   India');
console.log('');
console.log('✅ Account Status: Active');
console.log('✅ Email Verified: Yes');
console.log('✅ Phone Verified: Yes');
console.log('');
console.log('🌐 Website: https://your-hash-website.vercel.app');
console.log('');
console.log('📋 INSTRUCTIONS FOR RAZORPAY:');
console.log('1. Visit the website above');
console.log('2. Click "Sign Up" or "Register"');
console.log('3. Use the email and password provided');
console.log('4. Complete a test purchase to verify payment flow');
console.log('5. Check all compliance pages are accessible');
console.log('');
console.log('💡 Alternative: Create this user manually in your admin panel');
console.log('   or register directly on the website');
console.log('');
console.log('🛒 TEST PURCHASE FLOW:');
console.log('1. Browse products in the shop');
console.log('2. Add items to cart');
console.log('3. Proceed to checkout');
console.log('4. Use Razorpay test card: 4111 1111 1111 1111');
console.log('5. Any future date for expiry');
console.log('6. Any 3-digit CVV');
console.log('');
console.log('=====================================');
console.log('');

// Export for programmatic use
export const razorpayTestUser = {
  name: 'Razorpay Test User',
  email: 'razorpay.test@hashdemo.com',
  password: 'RazorpayTest@2024',
  phone: '+919876543210',
  address: {
    line1: 'NITK Surathkal Campus',
    line2: 'Student Hostel Block',
    city: 'Mangalore',
    state: 'Karnataka',
    zip: '575025',
    country: 'India'
  },
  isEmailVerified: true,
  isPhoneVerified: true,
  status: 'active'
};
