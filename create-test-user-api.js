import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const createTestUserViaAPI = async () => {
  try {
    console.log('🔄 Creating Razorpay test user via API...\n');

    // Test user data
    const testUserData = {
      name: 'Razorpay Test User',
      email: 'razorpay.test@hashdemo.com',
      password: 'RazorpayTest@2024',
      phone: '+919876543210'
    };

    // Check if user already exists by trying to login
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUserData.email,
        password: testUserData.password
      });

      if (loginResponse.data.success) {
        console.log('✅ Test user already exists and login works!');
        console.log('📧 Email:', testUserData.email);
        console.log('🔐 Password:', testUserData.password);
        console.log('🆔 User ID:', loginResponse.data.user.id);
        return;
      }
    } catch (loginError) {
      // User doesn't exist or wrong credentials, continue with registration
      console.log('👤 User doesn\'t exist yet, creating new user...');
    }

    // Register the test user
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUserData);

    if (registerResponse.data.success) {
      console.log('✅ TEST USER CREATED SUCCESSFULLY!\n');
      console.log('📋 CREDENTIALS FOR RAZORPAY:');
      console.log('=====================================');
      console.log('📧 Email:', testUserData.email);
      console.log('🔐 Password:', testUserData.password);
      console.log('📱 Phone:', testUserData.phone);
      console.log('👤 Name:', testUserData.name);
      console.log('🆔 User ID:', registerResponse.data.user.id);
      console.log('=====================================\n');

      // Test login to verify
      const verifyLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUserData.email,
        password: testUserData.password
      });

      if (verifyLogin.data.success) {
        console.log('✅ Login verification successful!');
        console.log('🎯 User is ready for Razorpay testing\n');
      }
    }

  } catch (error) {
    console.error('❌ Error creating test user:', error.response?.data || error.message);
    
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('\n💡 User might already exist. Try logging in with:');
      console.log('📧 Email: razorpay.test@hashdemo.com');
      console.log('🔐 Password: RazorpayTest@2024');
    }
  }
};

// Run the function
createTestUserViaAPI();
