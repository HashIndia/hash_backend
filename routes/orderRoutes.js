import express from 'express';
import {
  getUserOrders,
  getOrder,
  createOrder,
  cancelOrder
} from '../controllers/orderController.js';
import { protectUser } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protectUser);

router.route('/')
  .get(getUserOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrder)
  .patch(cancelOrder);

export default router;