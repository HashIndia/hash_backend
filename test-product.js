import fetch from 'node-fetch';

const API_BASE = 'http://localhost:50001/api';

async function testProductCreation() {
  try {
    // First, login as admin
    console.log('Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@hash.com',
        password: 'admin123' // You might need to check the actual password
      })
    });

    const loginResult = await loginResponse.json();
    console.log('Login response:', loginResult);

    if (!loginResponse.ok) {
      console.error('Login failed:', loginResult);
      return;
    }

    // Extract cookies from login
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Received cookies:', cookies);

    // Try to create a product
    console.log('\nTesting product creation...');
    const productData = {
      name: 'Test Product',
      description: 'This is a test product for debugging',
      price: 99.99,
      category: 'clothing',
      stock: 50,
      sku: 'TEST-001'
    };

    const createResponse = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(productData)
    });

    const createResult = await createResponse.json();
    console.log('Product creation response:', createResult);

    if (createResponse.ok) {
      console.log('✅ Product created successfully!');
    } else {
      console.log('❌ Product creation failed:', createResult);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProductCreation();
