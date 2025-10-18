import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import Order from '../models/Order.js';
import * as paymentService from '../services/paymentService.js';

export const createPaymentOrder = catchAsync(async (req, res, next) => {
  const { orderId, amount } = req.body;
  
  if (!orderId || !amount) {
    return next(new AppError('Order ID and amount are required', 400));
  }

  // Get order details to extract customer info
  const order = await Order.findById(orderId).populate('user');
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.user._id.toString() !== req.user.id) {
    return next(new AppError('You can only create payment for your own orders', 403));
  }

  const customerDetails = {
    customerId: order.user._id.toString(),
    name: order.user.name,
    email: order.user.email,
    phone: order.user.phone
  };

  const paymentOrderData = {
    orderId: order._id.toString(),
    amount: amount,
    customerDetails
  };

  const paymentOrder = await paymentService.createPaymentOrder(paymentOrderData);

  // Update order with Razorpay order ID
  order.razorpayOrderId = paymentOrder.razorpayOrderId;
  order.paymentStatus = 'initiated';
  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      razorpayOrderId: paymentOrder.razorpayOrderId,
      orderId: paymentOrder.orderId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      key: paymentOrder.key
    }
  });
});

export const verifyPaymentStatus = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Payment verification data is incomplete', 400));
  }

  const paymentData = {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  };

  const verification = await paymentService.verifyPayment(paymentData);

  if (!verification.success) {
    return next(new AppError(verification.message || 'Payment verification failed', 400));
  }

  // Find order by Razorpay order ID
  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Update order based on payment verification
  if (verification.verified && verification.paymentStatus === 'captured') {
    order.paymentStatus = 'paid';
    order.paymentId = verification.paymentId;
    // Set the actual payment method from Razorpay (card, upi, netbanking, wallet, etc.)
    order.paymentMethod = verification.method || 'online';
    order.status = 'confirmed';
    await order.save();
  } else {
    order.paymentStatus = 'failed';
    await order.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      verified: verification.verified,
      paymentStatus: verification.paymentStatus,
      order: order
    }
  });
});

export const handlePaymentWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookData = req.body;

  const verification = await paymentService.handleWebhook(webhookData, signature);

  if (verification.success) {
    const { event, payload } = webhookData;
    
    // Handle different webhook events
    if (event === 'payment.captured') {
      const { order_id, payment_id, status, method } = payload.payment.entity;
      
      const order = await Order.findOne({ razorpayOrderId: order_id });
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentId = payment_id;
        // Set the actual payment method from webhook data
        order.paymentMethod = method || 'online';
        order.status = 'confirmed';
        await order.save();
      }
    } else if (event === 'payment.failed') {
      const { order_id } = payload.payment.entity;
      
      const order = await Order.findOne({ razorpayOrderId: order_id });
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
      }
    }

    res.status(200).json({ status: 'success' });
  } else {
    res.status(400).json({ status: 'error', message: 'Invalid webhook' });
  }
});

// Add new endpoint for payment refunds
export const refundPayment = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { amount } = req.body; // Optional partial refund amount

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (!order.paymentId) {
    return next(new AppError('No payment found for this order', 400));
  }

  if (order.paymentStatus !== 'paid') {
    return next(new AppError('Only paid orders can be refunded', 400));
  }

  const refund = await paymentService.refundPayment(order.paymentId, amount);

  if (refund.success) {
    order.refundId = refund.refundId;
    order.refundStatus = refund.status;
    order.refundAmount = refund.amount;
    order.paymentStatus = amount ? 'partially_refunded' : 'refunded';
    await order.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      refund: refund,
      order: order
    }
  });
});
