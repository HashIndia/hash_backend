import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import emailService from '../services/emailService.js';

// Get user's orders
export const getUserOrders = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const orders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('items.product', 'name images price');
  
  const total = await Order.countDocuments({ user: req.user.id });
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: {
      orders
    }
  });
});

// Get single order
export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  }).populate('items.product', 'name images price');
  
  if (!order) {
    return next(new AppError('Order not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

// Create new order
export const createOrder = catchAsync(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    totalAmount,
    shippingCost = 0,
    taxAmount = 0
  } = req.body;
  
  if (!items || items.length === 0) {
    return next(new AppError('Order must contain at least one item', 400));
  }
  
  if (!shippingAddress) {
    return next(new AppError('Shipping address is required', 400));
  }
  
  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  // Calculate subtotal (verify with products from database)
  let subtotal = 0;
  const orderItems = [];
  
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      return next(new AppError(`Product ${item.product} not found`, 404));
    }
    
    // Check stock availability
    if (item.size && item.color) {
      // Check variant-specific stock
      const variant = product.variants.find(v => 
        v.size === item.size && v.color.hex === item.color
      );
      if (!variant) {
        return next(new AppError(`Variant ${item.size} - ${item.color} not found for ${product.name}`, 404));
      }
      if (variant.stock < item.quantity) {
        return next(new AppError(`Insufficient stock for ${product.name} (${item.size} - ${item.color}). Available: ${variant.stock}`, 400));
      }
    } else {
      // Check overall stock
      if (product.stock < item.quantity) {
        return next(new AppError(`Insufficient stock for ${product.name}`, 400));
      }
    }
    
    const itemTotal = product.getEffectivePrice() * item.quantity;
    subtotal += itemTotal;
    
    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.getEffectivePrice(), // Use effective price (includes offers)
      originalPrice: product.price, // Keep original price for reference
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      brand: product.brand,
      image: product.images[0],
      appliedOffer: null // Will be set later if offer is applied
    });
  }
  
  const order = await Order.create({
    orderNumber,
    user: req.user.id,
    items: orderItems,
    subtotal,
    shippingCost,
    taxAmount,
    totalAmount: subtotal + shippingCost + taxAmount,
    shippingAddress,
    paymentMethod,
    status: 'pending'
  });
  
  // Update product stock (both overall and variant-specific) and track limited offers
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (product) {
      // Check if this product has an active limited offer
      if (product.limitedOffer?.isActive && product.isOfferValid()) {
        // Check if we can fulfill the order with offer units
        const remainingOfferUnits = product.getRemainingOfferUnits();
        const orderQuantity = item.quantity;
        
        if (remainingOfferUnits >= orderQuantity) {
          // Update limited offer units sold
          await Product.findByIdAndUpdate(item.product, {
            $inc: { 'limitedOffer.unitsSold': orderQuantity }
          });
          
          // Add offer information to order item
          const offerIndex = orderItems.findIndex(orderItem => orderItem.product.toString() === item.product);
          if (offerIndex !== -1) {
            orderItems[offerIndex].appliedOffer = {
              type: 'limited',
              originalPrice: product.price,
              offerPrice: product.limitedOffer.specialPrice,
              discountAmount: (product.price - product.limitedOffer.specialPrice) * orderQuantity,
              offerTitle: product.limitedOffer.offerTitle
            };
          }
        }
      }
      
      // Update overall stock
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
      
      // Update variant-specific stock if size and color are specified
      if (item.size && item.color) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { 
            'variants.$[elem].stock': -item.quantity 
          }
        }, {
          arrayFilters: [
            { 
              'elem.size': item.size, 
              'elem.color.hex': item.color 
            }
          ]
        });
      }
    }
  }
  
  // Send order confirmation email
  try {
    await emailService.sendOrderConfirmationEmail(order);
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
  }
  
  res.status(201).json({
    status: 'success',
    data: {
      order
    }
  });
});

// Cancel order
export const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  });
  
  if (!order) {
    return next(new AppError('Order not found', 404));
  }
  
  if (order.status !== 'pending') {
    return next(new AppError('Only pending orders can be cancelled', 400));
  }
  
  order.status = 'cancelled';
  await order.save();
  
  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity }
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Order cancelled successfully',
    data: {
      order
    }
  });
});