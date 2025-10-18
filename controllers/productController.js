import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import Product from '../models/Product.js';
import { validationResult } from 'express-validator';

// Get all products (public)
export const getAllProducts = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 12,
    category,
    subcategory,
    brand,
    size,
    minPrice,
    maxPrice,
    search,
    sort = '-createdAt',
    status = 'active'
  } = req.query;

  const maxLimit = 50;
  const actualLimit = Math.min(parseInt(limit), maxLimit);

  const filter = { status };
  if (category) filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (brand) filter.brand = new RegExp(brand, 'i');
  if (size) {
    // Filter products that have the specified size in their variants
    filter['variants.size'] = size;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }
  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * actualLimit;
  const productFields = 'name price category images stock rating numReviews createdAt status brand isTrending isHero limitedOffer salePrice saleStartDate saleEndDate';

  const products = await Product.find(filter)
    .select(productFields)
    .sort(sort)
    .skip(skip)
    .limit(actualLimit)
    .lean();

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: products.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / actualLimit),
    data: {
      products
    }
  });
});

// Get single product (public)
export const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).select('-__v');
  if (!product) {
    return next(new AppError('Product not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { product }
  });
});

// Admin: Get all products
export const getAllProductsAdmin = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    search,
    sort = '-createdAt'
  } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { sku: new RegExp(search, 'i') }
    ];
  }

  const skip = (page - 1) * limit;
  const products = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: products.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    data: { products }
  });
});

// Admin: Create product
export const createProduct = catchAsync(async (req, res, next) => {
  // Check for empty request body
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Request body is empty. Please check if you are sending JSON data with correct Content-Type header.',
      receivedData: req.body
    });
  }
  
  // Validate request data
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errors.array(),
      receivedData: req.body
    });
  }

  // Validate required fields
  const requiredFields = ['name', 'price', 'category'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      receivedData: req.body
    });
  }

  // Ensure price is a valid number
  if (isNaN(parseFloat(req.body.price))) {
    return res.status(400).json({
      status: 'fail',
      message: 'Price must be a valid number',
      receivedData: { price: req.body.price }
    });
  }

  // Process and sanitize product data
  const productData = {
    name: req.body.name?.trim() || '',
    description: req.body.description?.trim() || '',
    price: parseFloat(req.body.price) || 0,
    category: req.body.category?.trim() || '',
    subcategory: req.body.subcategory?.trim() || '',
    brand: req.body.brand?.trim() || '',
    sku: req.body.sku?.trim() || undefined,
    stock: parseInt(req.body.stock) || 0,
    status: req.body.status || 'active',
    images: Array.isArray(req.body.images) ? req.body.images : [],
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    isFeatures: Boolean(req.body.isFeatures) || false,
    isTrending: Boolean(req.body.isTrending) || false,
    isHero: Boolean(req.body.isHero) || false,
    variants: Array.isArray(req.body.variants) ? req.body.variants.map(variant => ({
      size: variant.size || '',
      color: {
        name: variant.color?.name || '',
        hex: variant.color?.hex || '#000000'
      },
      stock: parseInt(variant.stock) || 0,
      price: variant.price ? parseFloat(variant.price) : undefined,
      sku: variant.sku || ''
    })) : [],
    sizeChart: req.body.sizeChart || {
      hasChart: false,
      chartType: 'clothing',
      measurements: [],
      guidelines: []
    }
  };

  // Calculate total stock from variants if present
  if (productData.variants.length > 0) {
    productData.stock = productData.variants.reduce((total, variant) => total + variant.stock, 0);
  }

  // Handle limited offer data if present
  if (req.body.limitedOffer) {
    productData.limitedOffer = {
      isActive: Boolean(req.body.limitedOffer.isActive) || false,
      specialPrice: parseFloat(req.body.limitedOffer.specialPrice) || 0,
      maxUnits: parseInt(req.body.limitedOffer.maxUnits) || 0,
      offerTitle: req.body.limitedOffer.offerTitle || 'Limited Time Offer',
      offerDescription: req.body.limitedOffer.offerDescription || '',
      endDate: req.body.limitedOffer.endDate ? new Date(req.body.limitedOffer.endDate) : null,
      discountPercentage: parseFloat(req.body.limitedOffer.discountPercentage) || 0
    };
  }

  console.log('Product Data being sent to Product.create:', productData);
  
  try {
    const product = await Product.create(productData);
    res.status(201).json({
      status: 'success',
      data: { product }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Provide more specific error messages based on the type of error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        status: 'fail',
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Duplicate key error',
        error: error.keyValue
      });
    }
    
    return next(error);
  }
});

// Admin: Update product
export const updateProduct = catchAsync(async (req, res, next) => {
  console.log('Updating product with ID:', req.params.id);
  console.log('Update data:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const updateData = { ...req.body };

  // Parse numeric values
  if (updateData.price) updateData.price = parseFloat(updateData.price);
  if (updateData.discount) updateData.discount = parseFloat(updateData.discount);
  if (updateData.stock) updateData.stock = parseInt(updateData.stock, 10);

  // Handle boolean fields
  if ('isTrending' in req.body) {
    updateData.isTrending = Boolean(req.body.isTrending);
  }
  if ('isHero' in req.body) {
    updateData.isHero = Boolean(req.body.isHero);
  }

  // Handle images (assuming images are sent as an array of URLs or base64 strings)
  if (updateData.images && Array.isArray(updateData.images)) {
    // For simplicity, assuming images are already processed or are URLs
    // In a real app, you might handle file uploads here
    updateData.images = updateData.images.map(img => ({ url: img }));
  }

  // Handle limited offer
  if (updateData.limitedOffer && typeof updateData.limitedOffer === 'object') {
    if (updateData.limitedOffer.startDate) updateData.limitedOffer.startDate = new Date(updateData.limitedOffer.startDate);
    if (updateData.limitedOffer.endDate) updateData.limitedOffer.endDate = new Date(updateData.limitedOffer.endDate);
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { product }
  });
});

// Admin: Delete product
export const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Admin: Update product stock
export const updateProductStock = catchAsync(async (req, res, next) => {
  const { stock } = req.body;
  if (typeof stock !== 'number' || stock < 0) {
    return next(new AppError('Stock must be a non-negative number', 400));
  }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { stock },
    { new: true, runValidators: true }
  );
  if (!product) {
    return next(new AppError('Product not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { product }
  });
});

// Admin: Bulk update products
export const bulkUpdateProducts = catchAsync(async (req, res, next) => {
  const { productIds, updateData } = req.body;
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return next(new AppError('Product IDs array is required', 400));
  }
  const result = await Product.updateMany(
    { _id: { $in: productIds } },
    updateData,
    { runValidators: true }
  );
  res.status(200).json({
    status: 'success',
    message: `Updated ${result.modifiedCount} products`,
    data: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    }
  });
});

// Featured products
export const getFeaturedProducts = (req, res) => {
  res.json({ message: "Featured products endpoint not implemented yet." });
};

// Get all categories (public)
export const getCategories = catchAsync(async (req, res, next) => {
  const categories = await Product.distinct('category', { status: 'active' });
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// Get products by category (public)
export const getProductsByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;

  const products = await Product.find({ category, status: 'active' })
    .select('name price category images stock rating numReviews createdAt status brand isTrending isHero')
    .lean();

  if (!products || products.length === 0) {
    return next(new AppError(`No products found for category: ${category}`, 404));
  }

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});
