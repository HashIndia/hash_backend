import express from 'express';
import { 
  createPaymentOrder, 
  verifyPaymentStatus, 
  handlePaymentWebhook,
  refundPayment
} from '../controllers/paymentController.js';
import { protectUser, protectAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create payment order
router.post('/create-order', protectUser, createPaymentOrder);

// Verify payment status (changed from GET to POST for Razorpay data)
router.post('/verify', protectUser, verifyPaymentStatus);

// Webhook for payment status updates
router.post('/webhook', handlePaymentWebhook);

// Refund payment (admin only)
router.post('/refund/:orderId', protectAdmin, refundPayment);

export default router;
