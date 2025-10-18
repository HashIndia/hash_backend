import mongoose from 'mongoose';

const recipientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  email: String,
  phone: String,
  name: String,
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'unsubscribed'],
    default: 'pending'
  },
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
  errorMessage: String
});

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    maxlength: [100, 'Campaign name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'whatsapp'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'completed', 'cancelled', 'failed'],
    default: 'draft'
  },
  subject: {
    type: String,
    required: function() {
      return this.type === 'email';
    },
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Campaign content is required']
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  htmlContent: String, // For email campaigns
  templateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Template'
  },
  // Audience targeting
  targetAudience: {
    type: String,
    enum: ['all_users', 'active_users', 'inactive_users', 'new_users', 'vip_users', 'custom'],
    default: 'all_users'
  },
  customAudience: {
    userIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    filters: {
      totalOrders: {
        min: Number,
        max: Number
      },
      totalSpent: {
        min: Number,
        max: Number
      },
      lastOrderDate: {
        after: Date,
        before: Date
      },
      registrationDate: {
        after: Date,
        before: Date
      },
      location: {
        cities: [String],
        states: [String]
      },
      tags: [String],
      preferences: {
        emailNotifications: Boolean,
        smsNotifications: Boolean
      }
    }
  },
  recipients: [recipientSchema],
  // Scheduling
  scheduledAt: Date,
  sendImmediately: {
    type: Boolean,
    default: false
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  // Analytics
  stats: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Number,
      default: 0
    }
  },
  // Campaign settings
  settings: {
    sendTestFirst: {
      type: Boolean,
      default: false
    },
    testRecipients: [String],
    throttle: {
      enabled: {
        type: Boolean,
        default: false
      },
      messagesPerMinute: {
        type: Number,
        default: 100
      }
    },
    retryFailed: {
      type: Boolean,
      default: true
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    }
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  tags: [String],
  notes: String,
  sentAt: Date,
  completedAt: Date,
  errorLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    error: String,
    recipientId: mongoose.Schema.Types.ObjectId
  }]
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ type: 1, status: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ scheduledAt: 1, status: 1 });
campaignSchema.index({ targetAudience: 1 });

// Calculate stats before saving
campaignSchema.pre('save', function(next) {
  if (this.recipients && this.recipients.length > 0) {
    this.stats.totalRecipients = this.recipients.length;
    this.stats.sent = this.recipients.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
    this.stats.delivered = this.recipients.filter(r => r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked').length;
    this.stats.opened = this.recipients.filter(r => r.status === 'opened' || r.status === 'clicked').length;
    this.stats.clicked = this.recipients.filter(r => r.status === 'clicked').length;
    this.stats.failed = this.recipients.filter(r => r.status === 'failed').length;
    this.stats.bounced = this.recipients.filter(r => r.status === 'bounced').length;
    this.stats.unsubscribed = this.recipients.filter(r => r.status === 'unsubscribed').length;
  }
  next();
});

// Virtual for open rate
campaignSchema.virtual('openRate').get(function() {
  if (this.stats.delivered === 0) return 0;
  return Math.round((this.stats.opened / this.stats.delivered) * 100);
});

// Virtual for click rate
campaignSchema.virtual('clickRate').get(function() {
  if (this.stats.delivered === 0) return 0;
  return Math.round((this.stats.clicked / this.stats.delivered) * 100);
});

// Virtual for delivery rate
campaignSchema.virtual('deliveryRate').get(function() {
  if (this.stats.totalRecipients === 0) return 0;
  return Math.round((this.stats.delivered / this.stats.totalRecipients) * 100);
});

// Method to add recipient
campaignSchema.methods.addRecipient = function(recipientData) {
  this.recipients.push(recipientData);
  this.stats.totalRecipients = this.recipients.length;
  return this.save();
};

// Method to update recipient status
campaignSchema.methods.updateRecipientStatus = function(recipientId, status, timestamp) {
  const recipient = this.recipients.id(recipientId);
  if (recipient) {
    recipient.status = status;
    
    switch (status) {
      case 'sent':
        recipient.sentAt = timestamp || new Date();
        break;
      case 'delivered':
        recipient.deliveredAt = timestamp || new Date();
        break;
      case 'opened':
        recipient.openedAt = timestamp || new Date();
        break;
      case 'clicked':
        recipient.clickedAt = timestamp || new Date();
        break;
    }
    
    return this.save();
  }
  return false;
};

// Method to mark campaign as completed
campaignSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to cancel campaign
campaignSchema.methods.cancel = function(reason) {
  if (['draft', 'scheduled'].includes(this.status)) {
    this.status = 'cancelled';
    this.notes = (this.notes || '') + `\nCancelled: ${reason}`;
    return this.save();
  }
  throw new Error('Cannot cancel campaign in current status');
};

// Ensure virtuals are included in JSON
campaignSchema.set('toJSON', { virtuals: true });
campaignSchema.set('toObject', { virtuals: true });

export default mongoose.model('Campaign', campaignSchema); 