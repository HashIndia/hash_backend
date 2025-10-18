import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { validationResult } from 'express-validator';

// Create a new review
export const createReview = catchAsync(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed: ' + errors.array().map(err => err.msg).join(', '), 400));
  }
  
  const { productId, orderId, rating, title, comment, images = [] } = req.body;
  const userId = req.user.id;

  // Check if user has purchased this product
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    status: 'delivered',
    'items.product': productId
  });

  if (!order) {
    return next(new AppError('You can only review products you have purchased and received', 400));
  }

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    product: productId,
    user: userId
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this product', 400));
  }

  // Create review
  const review = await Review.create({
    product: productId,
    user: userId,
    order: orderId,
    rating,
    title: title || '',
    comment,
    images,
    status: 'approved' // Auto-approve for now, can add moderation later
  });

  // Update product review stats
  await updateProductReviewStats(productId);

  // Populate user info before sending response
  await review.populate('user', 'name email');

  res.status(201).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Get reviews for a product
export const getProductReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const reviews = await Review.find({
    product: productId,
    status: 'approved'
  })
    .populate('user', 'name')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalReviews = await Review.countDocuments({
    product: productId,
    status: 'approved'
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    totalReviews,
    totalPages: Math.ceil(totalReviews / limit),
    currentPage: page * 1,
    data: {
      reviews
    }
  });
});

// Get user's reviews
export const getUserReviews = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const reviews = await Review.find({ user: userId })
    .populate('product', 'name images')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalReviews = await Review.countDocuments({ user: userId });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    totalReviews,
    totalPages: Math.ceil(totalReviews / limit),
    currentPage: page * 1,
    data: {
      reviews
    }
  });
});

// Update review
export const updateReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const { rating, title, comment, images } = req.body;
  const userId = req.user.id;

  const review = await Review.findOne({
    _id: reviewId,
    user: userId
  });

  if (!review) {
    return next(new AppError('Review not found or you are not authorized to update it', 404));
  }

  // Update fields
  if (rating) review.rating = rating;
  if (title) review.title = title;
  if (comment) review.comment = comment;
  if (images) review.images = images;

  await review.save();

  // Update product review stats
  await updateProductReviewStats(review.product);

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Delete review
export const deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  const review = await Review.findOne({
    _id: reviewId,
    user: userId
  });

  if (!review) {
    return next(new AppError('Review not found or you are not authorized to delete it', 404));
  }

  const productId = review.product;
  await Review.findByIdAndDelete(reviewId);

  // Update product review stats
  await updateProductReviewStats(productId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get reviewable products for user (products they bought but haven't reviewed)
export const getReviewableProducts = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Get all delivered orders for the user
  const orders = await Order.find({
    user: userId,
    status: 'delivered'
  }).populate('items.product', 'name images');

  // Get all products the user has reviewed
  const reviewedProducts = await Review.find({ user: userId }).select('product');
  const reviewedProductIds = reviewedProducts.map(review => review.product.toString());

  // Filter products that haven't been reviewed
  const reviewableProducts = [];
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.product && !reviewedProductIds.includes(item.product._id.toString())) {
        const existingProduct = reviewableProducts.find(p => p.product._id.toString() === item.product._id.toString());
        if (!existingProduct) {
          reviewableProducts.push({
            product: item.product,
            orderId: order._id,
            purchaseDate: order.createdAt
          });
        }
      }
    });
  });

  res.status(200).json({
    status: 'success',
    results: reviewableProducts.length,
    data: {
      products: reviewableProducts
    }
  });
});

// Helper function to update product review statistics
async function updateProductReviewStats(productId) {
  const reviews = await Review.find({
    product: productId,
    status: 'approved'
  });

  const totalReviews = reviews.length;
  
  if (totalReviews === 0) {
    await Product.findByIdAndUpdate(productId, {
      'reviewStats.averageRating': 0,
      'reviewStats.totalReviews': 0,
      'reviewStats.ratingDistribution': { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / totalReviews;

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    ratingDistribution[review.rating]++;
  });

  await Product.findByIdAndUpdate(productId, {
    'reviewStats.averageRating': Math.round(averageRating * 10) / 10, // Round to 1 decimal
    'reviewStats.totalReviews': totalReviews,
    'reviewStats.ratingDistribution': ratingDistribution
  });
}
