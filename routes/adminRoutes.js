import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { protectAdmin, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Public admin routes
router.post('/login', adminController.login);
router.post('/refresh-token', adminController.refreshToken);

// All routes below are protected and require an admin to be logged in
router.use(protectAdmin);

router.post('/logout', adminController.logout);
router.post('/logout-all', adminController.logoutAll);
router.get('/me', adminController.getMe);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User Management
router.get('/users', restrictTo('admin', 'superadmin'), adminController.getAllUsers);
router.get('/users/:id', restrictTo('admin', 'superadmin'), adminController.getUser);
router.get('/users/count', restrictTo('admin', 'superadmin'), adminController.getUserCount);

// Order Management
router.get('/orders', restrictTo('admin', 'superadmin'), adminController.getAllOrders);
router.patch('/orders/:id/status', restrictTo('admin', 'superadmin'), adminController.updateOrderStatus);

// Broadcast Management
router.post('/broadcast/email', restrictTo('admin', 'superadmin'), adminController.sendBroadcastEmail);
router.post('/broadcast/email/targeted', restrictTo('admin', 'superadmin'), adminController.sendTargetedEmail);

// Temporary route to create admin (remove after creating admin)
router.post('/create-admin', async (req, res) => {
  try {
    const Admin = (await import('../models/Admin.js')).default;
    
    const existingAdmin = await Admin.findOne({ email: 'admin@hashstore.com' });
    if (existingAdmin) {
      return res.json({ message: 'Admin already exists' });
    }
    
    const admin = await Admin.create({
      name: 'Admin User', // Add required name field
      email: 'admin@hashstore.com',
      password: 'admin123',
      role: 'super_admin', // Use super_admin instead of superadmin
      status: 'active'
    });
    
    res.json({ 
      message: 'Admin created successfully',
      email: admin.email,
      note: 'Use email: admin@hashstore.com, password: admin123 to login'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;