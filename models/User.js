import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const addressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email"]
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^\+?[\d\s-()]+$/, "Please enter a valid phone number"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false
    },
    avatar: { type: String, default: "" },
    addresses: [addressSchema],
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    phoneVerificationOTP: String,
    otpExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: true }
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ["user"], default: "user" },
    verifiedAt: { type: Date },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, required: true, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active"
    }
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });

// Password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Virtuals
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Static OTP generator
userSchema.statics.generateOTP = function () {
  const otpLength = process.env.OTP_LENGTH || 4;
  return Array.from({ length: otpLength }, () => Math.floor(Math.random() * 10)).join("");
};

// Instance methods
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.incLoginAttempts = async function () {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const lockTime = parseInt(process.env.LOGIN_LOCK_TIME_MINUTES, 10) || 15;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
  }

  if (this.loginAttempts >= maxAttempts) {
    this.lockUntil = Date.now() + lockTime * 60 * 1000;
  }

  await this.save({ validateBeforeSave: false });
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Address helpers
userSchema.methods.addAddress = function (addressData) {
  if (this.addresses.length === 0 || addressData.isDefault) {
    this.addresses.forEach((addr) => (addr.isDefault = false));
    addressData.isDefault = true;
  }
  this.addresses.push(addressData);
  return this.save();
};

userSchema.methods.updateAddress = function (addressId, updateData) {
  const address = this.addresses.id(addressId);
  if (!address) throw new Error("Address not found");

  if (updateData.isDefault) {
    this.addresses.forEach((addr) => (addr.isDefault = false));
  }

  Object.assign(address, updateData);
  return this.save();
};

userSchema.methods.removeAddress = function (addressId) {
  this.addresses.id(addressId).remove();
  if (this.addresses.length > 0 && !this.addresses.some((addr) => addr.isDefault)) {
    this.addresses[0].isDefault = true;
  }
  return this.save();
};

export default mongoose.model("User", userSchema);
