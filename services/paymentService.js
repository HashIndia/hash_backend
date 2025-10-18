import dotenv from 'dotenv';
import crypto from 'crypto';
import AppError from '../utils/appError.js';

dotenv.config();

// Check if Razorpay credentials are configured
const isTestMode = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id_here';

// Initialize Razorpay instance
let razorpay = null;
if (!isTestMode) {
  try {
    const Razorpay = (await import('razorpay')).default;
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (error) {
    console.error('Failed to initialize Razorpay:', error.message);
  }
}

export const createPaymentOrder = async (orderData) => {
  try {
    const { orderId, amount, customerDetails } = orderData;
    
    if (isTestMode) {
      // Mock response for testing
      return {
        success: true,
        razorpayOrderId: `test_order_${orderId}_${Date.now()}`,
        orderId: orderId,
        amount: amount,
        currency: 'INR',
        key: 'test_key'
      };
    }

    if (!razorpay) {
      throw new AppError('Razorpay not initialized. Check credentials.', 500);
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: orderId,
      notes: {
        orderId: orderId,
        customerId: customerDetails.customerId,
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: customerDetails.phone
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    if (razorpayOrder && razorpayOrder.id) {
      return {
        success: true,
        razorpayOrderId: razorpayOrder.id,
        orderId: orderId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } else {
      throw new AppError('Failed to create Razorpay order', 400);
    }
  } catch (error) {
    console.error('Payment order creation failed:', error);
    throw new AppError(error.message || 'Payment order creation failed', 500);
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    if (isTestMode) {
      // Mock successful payment verification for testing
      return {
        success: true,
        paymentStatus: 'captured',
        paymentId: razorpay_payment_id || `test_payment_${Date.now()}`,
        orderId: razorpay_order_id || 'test_order',
        verified: true,
        method: 'card' // Default to card for test mode
      };
    }

    if (!razorpay) {
      throw new AppError('Razorpay not initialized. Check credentials.', 500);
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    const isSignatureValid = generated_signature === razorpay_signature;

    if (!isSignatureValid) {
      return {
        success: false,
        verified: false,
        message: 'Payment signature verification failed'
      };
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    return {
      success: true,
      verified: true,
      paymentStatus: payment.status,
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      method: payment.method,
      email: payment.email,
      contact: payment.contact
    };
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw new AppError(error.message || 'Payment verification failed', 500);
  }
};

export const handleWebhook = async (webhookData, signature) => {
  try {
    console.log('Razorpay webhook received:', webhookData);
    
    if (isTestMode) {
      return {
        success: true,
        data: webhookData
      };
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError('Webhook secret not configured', 500);
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookData))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    return {
      success: true,
      data: webhookData,
      event: webhookData.event
    };
  } catch (error) {
    console.error('Webhook verification failed:', error);
    throw new AppError(error.message || 'Webhook verification failed', 500);
  }
};

export const refundPayment = async (paymentId, amount = null) => {
  try {
    if (isTestMode) {
      return {
        success: true,
        refundId: `test_refund_${paymentId}_${Date.now()}`,
        status: 'processed'
      };
    }

    if (!razorpay) {
      throw new AppError('Razorpay not initialized. Check credentials.', 500);
    }

    const refundData = {};
    if (amount) {
      refundData.amount = amount * 100; // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundData);

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100, // Convert from paise
      currency: refund.currency
    };
  } catch (error) {
    console.error('Refund failed:', error);
    throw new AppError(error.message || 'Refund failed', 500);
  }
};