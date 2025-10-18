# Hash Store Backend API

A robust e-commerce backend built with Node.js, Express, MongoDB, and various third-party services using **ES6 Modules**.

## 🚀 Features

### Core Features
- **User Authentication**: Registration, login, OTP verification, password reset
- **Product Management**: CRUD operations, image uploads, reviews, ratings
- **Order Management**: Order processing, payment integration, tracking, OTP delivery verification
- **Admin Panel**: Comprehensive admin features for managing products, orders, customers
- **File Upload**: Cloudinary integration for image management
- **Email Service**: Nodemailer integration for transactional emails
- **Payment Gateway**: Razorpay integration for secure payments

### Security Features
- JWT authentication with secure cookies
- Rate limiting and CORS protection
- Input validation and sanitization
- Password hashing with bcrypt
- Secure file upload with size limits
- Account lockout after failed login attempts

### Business Features
- Shopping cart management
- Wishlist functionality
- Address management
- Order tracking with delivery OTP
- Inventory management
- Customer segmentation
- Marketing campaigns (email/SMS)
- Analytics and reporting

## 📋 Prerequisites

- Node.js (v16.0.0 or higher) - **ES6 Modules support required**
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the sample environment file and configure:
   ```bash
   cp .env.sample .env
   ```
   
   Then edit `.env` with your actual credentials:
   ```env
   # Basic Configuration
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hash-ecommerce
   JWT_SECRET=your-super-secret-jwt-key-at-least-64-characters-long
   
   # Third-party Services
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-digit-app-password
   
   FRONTEND_URL=http://localhost:5173
   ADMIN_URL=http://localhost:5174
   ```

4. **Start the server**
   ```bash
   # Development with auto-restart
   npm run dev

   # Production
   npm start
   ```

## 🔧 ES6 Modules Configuration

This project uses **ES6 Modules** instead of CommonJS:

- ✅ `import/export` syntax
- ✅ `"type": "module"` in package.json
- ✅ `.js` file extensions in imports
- ✅ Modern JavaScript features

### Key Changes from CommonJS:
```javascript
// OLD (CommonJS)
const express = require('express');
module.exports = router;

// NEW (ES6 Modules) 
import express from 'express';
export default router;
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "phone": "+919876543210",
  "password": "SecurePass123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Additional Endpoints Available:
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Password reset
- `PATCH /api/auth/change-password` - Change password
- `GET /api/auth/addresses` - Get user addresses
- `POST /api/auth/addresses` - Add new address
- `GET /api/auth/wishlist` - Get wishlist
- `POST /api/auth/wishlist/:productId` - Add to wishlist

## 🗂️ Project Structure

```
backend/
├── controllers/         # Route controllers (ES6 exports)
│   ├── authController.js
│   ├── productController.js
│   ├── orderController.js
│   └── adminController.js
├── middleware/          # Custom middleware
│   ├── auth.js
│   ├── upload.js
│   └── errorHandler.js
├── models/              # MongoDB models
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Admin.js
│   └── Campaign.js
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   └── adminRoutes.js
├── services/            # External services
│   ├── emailService.js
│   └── paymentService.js
├── utils/               # Utility functions
│   ├── appError.js
│   └── catchAsync.js
├── .env.sample          # Environment variables template
├── package.json         # ES6 modules enabled
└── server.js           # Main server file
```

## 🔐 Authentication Flow

1. **Registration**: User registers with email/phone
2. **OTP Verification**: SMS OTP sent for phone verification
3. **Login**: User logs in with verified credentials
4. **JWT Token**: Secure token issued for authenticated requests
5. **Protected Routes**: Token required for accessing protected endpoints

## 💳 Payment Integration

### Razorpay Integration
- Create payment orders
- Verify payment signatures  
- Handle webhooks for payment status updates
- Support for multiple payment methods (cards, UPI, net banking)

### Payment Flow
1. Create order with payment intent
2. Redirect to Razorpay checkout
3. Process payment with Razorpay
4. Verify payment signature
5. Update order status

## 📱 Email Services

### Email Features (Nodemailer)
- Welcome emails
- OTP verification
- Order confirmations
- Shipping notifications
- Password reset
- Marketing campaigns

## 🖼️ File Upload

### Cloudinary Integration
- Automatic image optimization
- Multiple format support
- Responsive image URLs
- Secure upload with validations

## 🛡️ Security Measures

- **Authentication**: JWT with secure HTTP-only cookies
- **Authorization**: Role-based access control
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation
- **CORS**: Configured for specific origins
- **Helmet**: Security headers protection
- **Password Security**: Bcrypt hashing with salt

## 📊 Error Handling

- **Global Error Handler**: Centralized error handling
- **Custom Error Classes**: Operational vs programming errors
- **Validation Errors**: Detailed validation error responses
- **Development vs Production**: Different error details based on environment

## 🚀 Quick Start

1. **Set up MongoDB** (local or Atlas)
2. **Create accounts** for third-party services:
   - [Cloudinary](https://cloudinary.com/) - Image management
   - [Razorpay](https://razorpay.com/) - Payment gateway
3. **Configure Gmail App Password** for emails
4. **Copy and edit** `.env.sample` to `.env`
5. **Start development server**: `npm run dev`

## 📝 API Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    "user": {...}
  }
}
```

### Error Response
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

## 🔧 Environment Variables

See `.env.sample` for a complete list of required environment variables including:

- **Database**: MongoDB connection string
- **Authentication**: JWT secret
- **File Upload**: Cloudinary credentials  
- **Communications**: Twilio & email settings
- **Payments**: Razorpay API keys
- **URLs**: Frontend and admin URLs

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage  
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Hash Store Backend** - Built with ❤️ using modern ES6 modules for scalable e-commerce needs.