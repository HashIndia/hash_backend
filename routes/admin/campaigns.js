import express from 'express';
import { protectAdmin, restrictTo } from '../../middleware/auth.js';
import Campaign from '../../models/Campaign.js';
import User from '../../models/User.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

const router = express.Router();

// All routes are protected and require admin access
router.use(protectAdmin);
router.use(restrictTo('admin', 'super_admin'));

// @route   GET /api/admin/campaigns
// @desc    Get all campaigns
// @access  Private (Admin)
router.get('/', catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, type, status, search } = req.query;
  
  const query = {};
  
  if (type && type !== 'all') query.type = type;
  if (status && status !== 'all') query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } }
    ];
  }

  const campaigns = await Campaign.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');

  const total = await Campaign.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: campaigns.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit) || 1,
    data: { campaigns }
  });
}));

// @route   GET /api/admin/campaigns/:id
// @desc    Get single campaign
// @access  Private (Admin)
router.get('/:id', catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!campaign) {
    return next(new AppError('Campaign not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { campaign }
  });
}));

// @route   POST /api/admin/campaigns
// @desc    Create new campaign
// @access  Private (Admin)
router.post('/', catchAsync(async (req, res, next) => {
  const campaignData = {
    ...req.body,
    createdBy: req.admin.id
  };

  const campaign = await Campaign.create(campaignData);

  res.status(201).json({
    status: 'success',
    data: { campaign }
  });
}));

// @route   PUT /api/admin/campaigns/:id
// @desc    Update campaign
// @access  Private (Admin)
router.put('/:id', catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!campaign) {
    return next(new AppError('Campaign not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { campaign }
  });
}));

// @route   DELETE /api/admin/campaigns/:id
// @desc    Delete campaign
// @access  Private (Admin)
router.delete('/:id', catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return next(new AppError('Campaign not found', 404));
  }

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    return next(new AppError('Cannot delete campaign that is being sent or already sent', 400));
  }

  await Campaign.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
}));

// @route   POST /api/admin/campaigns/:id/send
// @desc    Send campaign
// @access  Private (Admin)
router.post('/:id/send', catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return next(new AppError('Campaign not found', 404));
  }

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return next(new AppError('Campaign can only be sent if it is in draft or scheduled status', 400));
  }

  // Get recipients based on campaign settings
  let recipients = [];
  
  if (campaign.recipientType === 'all_customers') {
    recipients = await User.find({ isActive: true }).select('name email phone');
  } else if (campaign.recipientType === 'vip_customers') {
    // This would need to be implemented based on your VIP logic
    recipients = await User.find({ 
      isActive: true,
      // Add VIP criteria here
    }).select('name email phone');
  }

  // Update campaign status
  campaign.status = 'sending';
  campaign.scheduledAt = new Date();
  campaign.recipients = recipients.map(user => ({
    user: user._id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    status: 'pending'
  }));

  await campaign.save();

  // Here you would integrate with your email/SMS service
  // For now, we'll just mark it as sent
  campaign.status = 'sent';
  campaign.sentAt = new Date();
  await campaign.save();

  res.status(200).json({
    status: 'success',
    message: 'Campaign sent successfully',
    data: { campaign }
  });
}));

export default router;
