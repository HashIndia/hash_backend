import express from 'express';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import { protectAdmin, restrictTo } from '../../middleware/auth.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

const router = express.Router();

// All routes are protected
router.use(protectAdmin);

// @route   GET /api/admin/customers
// @desc    Get all customers (admin)
// @access  Private (Admin)
router.get('/', catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status, search } = req.query;
  
  console.log('[DEBUG] Customer API called with params:', { page, limit, status, search });
  
  const query = {};
  
  if (status && status !== 'all') query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  console.log('[DEBUG] MongoDB query:', query);

  const customers = await User.find(query)
    .select('-password -passwordResetToken -passwordResetExpires')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  // Get order statistics for each customer
  const customersWithStats = await Promise.all(customers.map(async (customer) => {
    const orderStats = await Order.aggregate([
      { $match: { user: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrder: { $max: '$createdAt' }
        }
      }
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, lastOrder: null };

    return {
      ...customer.toObject(),
      totalOrders: stats.totalOrders,
      totalSpent: stats.totalSpent,
      lastOrder: stats.lastOrder,
      tags: stats.totalSpent > 1000 ? ['VIP'] : stats.totalOrders > 5 ? ['Loyal Customer'] : []
    };
  }));

  const total = await User.countDocuments(query);

  console.log('[DEBUG] Found customers with stats:', {
    results: customersWithStats.length,
    total,
    customerSample: customersWithStats.map(c => ({ 
      id: c._id, 
      name: c.name, 
      email: c.email, 
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent 
    }))
  });

  res.status(200).json({
    status: 'success',
    results: customersWithStats.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit) || 1,
    data: { customers: customersWithStats }
  });
}));

// @route   GET /api/admin/customers/:id
// @desc    Get single customer (admin)
// @access  Private (Admin)
router.get('/:id', catchAsync(async (req, res, next) => {
  const customer = await User.findById(req.params.id)
    .select('-password -passwordResetToken -passwordResetExpires');
  
  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  // Get order statistics for this customer
  const orderStats = await Order.aggregate([
    { $match: { user: customer._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
        lastOrder: { $max: '$createdAt' }
      }
    }
  ]);

  const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, lastOrder: null };

  const customerWithStats = {
    ...customer.toObject(),
    totalOrders: stats.totalOrders,
    totalSpent: stats.totalSpent,
    lastOrder: stats.lastOrder,
    tags: stats.totalSpent > 1000 ? ['VIP'] : stats.totalOrders > 5 ? ['Loyal Customer'] : []
  };

  res.status(200).json({
    status: 'success',
    data: { customer: customerWithStats }
  });
}));

// @route   PATCH /api/admin/customers/:id/status
// @desc    Update customer status (admin)
// @access  Private (Admin)
router.patch('/:id/status', restrictTo('admin', 'super_admin'), catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!['active', 'inactive', 'suspended'].includes(status)) {
    return next(new AppError('Invalid status value', 400));
  }

  const customer = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).select('-password -passwordResetToken -passwordResetExpires');

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { customer }
  });
}));

// @route   PUT /api/admin/customers/:id
// @desc    Update customer (admin)
// @access  Private (Admin)
router.put('/:id', restrictTo('admin', 'super_admin'), catchAsync(async (req, res, next) => {
  const customer = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password -passwordResetToken -passwordResetExpires');

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { customer }
  });
}));

export default router;
