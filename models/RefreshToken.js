import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  userAgent: {
    type: String
  },
  ip: {
    type: String
  },
  expires: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revoked: {
    type: Date
  },
  revokedByIp: {
    type: String
  }
});

// More robust validation with better error messages
refreshTokenSchema.pre('validate', function(next) {
  if (!this.user && !this.admin) {
    return next(new Error('A refresh token must be associated with a user or an admin.'));
  }
  next();
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;