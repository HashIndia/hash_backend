import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['clothing', 'accessories', 'shoes', 'bags', 'electronics', 'home', 'beauty', 'sports']
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  isTrending: { type: Boolean, default: false },
  isHero: { type: Boolean, default: false },

  variants: [{
    size: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', '6', '7', '8', '9', '10', '11', '12', 'ONE_SIZE']
    },
    color: {
      name: { type: String, required: true },
      hex: { type: String, required: true }
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Variant stock cannot be negative'],
      default: 0
    },
    price: { type: Number, min: [0, 'Variant price cannot be negative'] },
    sku: { type: String, trim: true },
    brand: { type: String, trim: true }
  }],

  sizeChart: {
    hasChart: { type: Boolean, default: false },
    chartType: { type: String, enum: ['clothing', 'shoes', 'accessories'], default: 'clothing' },
    measurements: [{
      size: String,
      chest: Number,
      waist: Number,
      hips: Number,
      length: Number,
      shoulders: Number,
      sleeves: Number
    }],
    guidelines: [String]
  },

  images: [{
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false }
  }],

  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'discontinued'],
    default: 'active'
  },
  tags: [String],
  weight: { type: Number, min: [0, 'Weight cannot be negative'] },
  dimensions: { length: Number, width: Number, height: Number },
  isFeatures: { type: Boolean, default: false },
  salePrice: { type: Number, min: [0, 'Sale price cannot be negative'] },
  saleStartDate: Date,
  saleEndDate: Date,

  // ✅ Enhanced: Limited stock offer with better tracking
  limitedOffer: {
    isActive: { type: Boolean, default: false },
    specialPrice: { type: Number, min: 0 },
    maxUnits: { type: Number, default: 0 }, // e.g. first 100 units
    unitsSold: { type: Number, default: 0 },
    offerTitle: { type: String, default: 'Limited Time Offer' },
    offerDescription: { type: String, default: 'Special price for first customers' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    discountPercentage: { type: Number, min: 0, max: 100 }
  },

  // ✅ New: Bundle offer (variety discount)
  bundleOffer: {
    isActive: { type: Boolean, default: false },
    type: { type: String, enum: ['variety'], default: 'variety' },
    minUniqueProducts: { type: Number, default: 0 }, // e.g. 12
    discountPerItem: { type: Number, default: 0 }    // e.g. ₹26 off each
  },

  minOrderQuantity: { type: Number, default: 1, min: [1, 'Minimum order quantity must be at least 1'] },
  maxOrderQuantity: { type: Number, default: 100 },

  reviewStats: {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    ratingDistribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  }
}, { timestamps: true });

// Indexes
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtuals
productSchema.virtual('currentPrice').get(function() {
  if (this.salePrice && this.saleStartDate && this.saleEndDate) {
    const now = new Date();
    if (now >= this.saleStartDate && now <= this.saleEndDate) {
      return this.salePrice;
    }
  }
  return this.price;
});

// ✅ Enhanced effective price considering limited offer
productSchema.methods.getEffectivePrice = function() {
  // Check if limited offer is active and still has units available
  if (this.limitedOffer?.isActive && 
      this.limitedOffer.unitsSold < this.limitedOffer.maxUnits &&
      (!this.limitedOffer.endDate || new Date() <= this.limitedOffer.endDate)) {
    return this.limitedOffer.specialPrice;
  }
  
  // Check regular sale price
  if (this.salePrice && this.saleStartDate && this.saleEndDate) {
    const now = new Date();
    if (now >= this.saleStartDate && now <= this.saleEndDate) {
      return this.salePrice;
    }
  }
  
  return this.price;
};

// ✅ Get remaining offer units
productSchema.methods.getRemainingOfferUnits = function() {
  if (!this.limitedOffer?.isActive) return 0;
  return Math.max(0, this.limitedOffer.maxUnits - this.limitedOffer.unitsSold);
};

// ✅ Check if offer is still valid
productSchema.methods.isOfferValid = function() {
  if (!this.limitedOffer?.isActive) return false;
  
  const now = new Date();
  const hasUnitsLeft = this.limitedOffer.unitsSold < this.limitedOffer.maxUnits;
  const isWithinDateRange = !this.limitedOffer.endDate || now <= this.limitedOffer.endDate;
  
  return hasUnitsLeft && isWithinDateRange;
};

productSchema.virtual('totalStock').get(function() {
  if (this.variants?.length > 0) {
    return this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  return this.stock;
});

productSchema.virtual('availableSizes').get(function() {
  if (this.variants?.length > 0) {
    const sizesWithStock = this.variants.filter(variant => variant.stock > 0);
    return [...new Set(sizesWithStock.map(variant => variant.size))];
  }
  return [];
});

productSchema.virtual('availableColors').get(function() {
  if (this.variants?.length > 0) {
    const colorsWithStock = this.variants.filter(variant => variant.stock > 0);
    return colorsWithStock.reduce((colors, variant) => {
      const existingColor = colors.find(c => c.hex === variant.color.hex);
      if (!existingColor) colors.push(variant.color);
      return colors;
    }, []);
  }
  return [];
});

// Stock methods
productSchema.methods.isOnSale = function() {
  if (!this.salePrice || !this.saleStartDate || !this.saleEndDate) return false;
  const now = new Date();
  return now >= this.saleStartDate && now <= this.saleEndDate;
};

productSchema.methods.getVariantStock = function(size, colorHex) {
  if (this.variants?.length > 0) {
    const variant = this.variants.find(v => v.size === size && v.color.hex === colorHex);
    return variant ? variant.stock : 0;
  }
  return 0;
};

productSchema.methods.getSizesForColor = function(colorHex) {
  if (this.variants?.length > 0) {
    const sizesForColor = this.variants.filter(v => v.color.hex === colorHex && v.stock > 0).map(v => v.size);
    return [...new Set(sizesForColor)];
  }
  return [];
};

productSchema.methods.getColorsForSize = function(size) {
  if (this.variants?.length > 0) {
    const colorsForSize = this.variants.filter(v => v.size === size && v.stock > 0).map(v => v.color);
    return colorsForSize.reduce((colors, color) => {
      if (!colors.find(c => c.hex === color.hex)) colors.push(color);
      return colors;
    }, []);
  }
  return [];
};

productSchema.methods.updateVariantStock = function(size, colorHex, quantity) {
  if (this.variants?.length > 0) {
    const variant = this.variants.find(v => v.size === size && v.color.hex === colorHex);
    if (variant) {
      variant.stock = Math.max(0, variant.stock - quantity);
      return true;
    }
  }
  return false;
};

productSchema.pre('save', function(next) {
  if (!this.sku) {
    this.sku = `HASH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  if (this.variants?.length > 0) {
    this.stock = this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  next();
});

export default mongoose.model('Product', productSchema);
