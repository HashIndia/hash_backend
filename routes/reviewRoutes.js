import express from 'express';
import { body } from 'express-validator';
import {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  getReviewableProducts
} from '../controllers/reviewController.js';
import { protectUser } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protectUser);

// Get reviewable products for user
router.get('/reviewable', getReviewableProducts);

// Get user's reviews
router.get('/my-reviews', getUserReviews);

// Create review
router.post('/',
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
    body('comment').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
  ],
  createReview
);

// Update review
router.patch('/:reviewId',
  [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
    body('comment').optional().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
  ],
  updateReview
);

// Delete review
router.delete('/:reviewId', deleteReview);

// Get reviews for a specific product (public route, but requires auth for now)
router.get('/product/:productId', getProductReviews);

export default router;
