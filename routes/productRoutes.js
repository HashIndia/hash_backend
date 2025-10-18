import express from 'express';
import { body } from 'express-validator';
import {
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getCategories
} from '../controllers/productController.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/featured', getFeaturedProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProduct);

export default router;