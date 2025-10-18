import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: String,
    color: String,
    image: String
  }],
  subtotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },

  // ✅ New: applied offers
  appliedOffers: [{
    type: {
      type: String,
      enum: ['limited', 'bundle'],
      required: true
    },
    description: String,
    discount: {
      type: Number,
      default: 0
    }
  }],

  discountAmount: {
    type: Number,
    default: 0
  },

  shippingAddress: {
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'card', 'upi', 'netbanking', 'wallet', 'emi'],
    default: 'online'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'initiated', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentSessionId: String,
  razorpayOrderId: String,
  paymentId: String,
  refundId: String,
  refundStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed']
  },
  refundAmount: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: String,
  deliveredAt: Date,
  estimatedDelivery: Date,
  deliveryOTP: {
    type: String,
    select: false
  },
  deliveryOTPExpires: {
    type: Date,
    select: false
  },
  deliveryOTPVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: customer info
orderSchema.virtual('customerInfo').get(function() {
  return {
    name: this.shippingAddress?.name,
    email: this.user?.email,
    phone: this.shippingAddress?.phone
  };
});

// Virtual: final payable amount
orderSchema.virtual('finalTotal').get(function() {
  return (this.totalAmount - this.discountAmount + this.shippingCost + this.taxAmount);
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
