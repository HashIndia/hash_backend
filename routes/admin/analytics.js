import express from 'express';
import { protectAdmin, restrictTo } from '../../middleware/auth.js';
import * as analyticsController from '../../controllers/analyticsController.js';
import { getSizeAnalytics } from '../../controllers/analyticsController.js';
const router = express.Router();

// All routes are protected and require admin access
router.use(protectAdmin);
router.use(restrictTo('admin', 'super_admin'));

// Analytics routes
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);
router.get('/products', analyticsController.getProductAnalytics);
router.get('/size', getSizeAnalytics);
router.get('/brand-size', analyticsController.getBrandSizeAnalytics);
router.get('/dashboard', analyticsController.getDashboardStats);

export default router;
