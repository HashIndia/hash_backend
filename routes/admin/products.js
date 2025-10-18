import express from 'express';
import { body } from 'express-validator';
import { protectAdmin, restrictTo } from '../../middleware/auth.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';
import {
  getAllProductsAdmin,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  bulkUpdateProducts
} from '../../controllers/productController.js';

const router = express.Router();

// Mock data for development (since the inline handlers reference it)
let mockProducts = [
  {
    _id: '1',
    name: 'Sample Product',
    category: 'clothing',
    price: 29.99,
    stock: 100,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// All routes require admin authentication
router.use(protectAdmin);

// Add a test route to debug middleware
router.post('/test', (req, res) => {
  console.log('Test route - Headers:', req.headers);
  console.log('Test route - Body:', req.body);
  res.json({
    status: 'success',
    message: 'Test route working',
    body: req.body,
    headers: req.headers
  });
});

// Simplified validation rules for debugging
const productValidation = [
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('Product name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .exists({ checkFalsy: true })
    .withMessage('Product description is required')
    .trim()
    .isLength({ min: 3, max: 2000 })
    .withMessage('Description must be between 3 and 2000 characters'),
  body('price')
    .exists({ checkFalsy: true })
    .withMessage('Price is required')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),
  body('category')
    .exists({ checkFalsy: true })
    .withMessage('Category is required')
    .trim()
    .isIn(['clothing', 'accessories', 'shoes', 'bags', 'electronics', 'home', 'beauty', 'sports'])
    .withMessage('Invalid category'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('brand')
    .optional(),
  body('subcategory')
    .optional(),
    body('isTrending').optional().isBoolean().withMessage('isTrending must be a boolean'),
body('isHero').optional().isBoolean().withMessage('isHero must be a boolean'),

];

const stockValidation = [
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
];

// Main routes using controllers
router.route('/')
  .get(restrictTo('admin', 'super_admin'), getAllProductsAdmin)
  .post(restrictTo('admin', 'super_admin'), productValidation, createProduct);

router.route('/bulk-update')
  .patch(restrictTo('admin', 'super_admin'), bulkUpdateProducts);

router.route('/:id')
  .get(restrictTo('admin', 'super_admin'), getProduct)
  .put(restrictTo('admin', 'super_admin'), productValidation, updateProduct)
  .delete(restrictTo('admin', 'super_admin'), deleteProduct);

router.route('/:id/stock')
  .patch(restrictTo('admin', 'super_admin'), stockValidation, updateProductStock);

export default router;
