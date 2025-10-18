import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

// Simplified cookie options for development
const cookieOptions = {
  httpOnly: true,
  secure: false, // Always false for development
  sameSite: 'lax',
  path: '/',
};

// --- Access Token ---
const generateAccessToken = (id, userType = 'user') => {
  const secret = userType === 'admin' ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET;
  const expiresIn = userType === 'admin' ? process.env.ADMIN_JWT_EXPIRES_IN || '1h' : process.env.JWT_EXPIRES_IN || '15m';
  
  if (!secret) {
    throw new Error(`${userType.toUpperCase()}_JWT_SECRET environment variable is not set`);
  }
  
  return jwt.sign({ id }, secret, { expiresIn });
};

// --- Refresh Token ---
export const generateRefreshToken = async (user, userType, ip, userAgent) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresIn = userType === 'admin' ? 
    parseInt(process.env.ADMIN_REFRESH_EXPIRES_DAYS, 10) || 30 : 
    parseInt(process.env.REFRESH_EXPIRES_DAYS, 10) || 7;
  
  const expires = new Date();
  expires.setDate(expires.getDate() + expiresIn);

  const refreshTokenData = {
    token,
    expires,
    createdByIp: ip,
    userAgent
  };

  if (userType === 'admin') {
    refreshTokenData.admin = user._id;
  } else {
    refreshTokenData.user = user._id;
  }

  const refreshToken = await RefreshToken.create(refreshTokenData);
  return refreshToken.token;
};

// --- Generate Tokens ---
export const generateTokens = (payload, userType = 'user') => {
  const accessToken = generateAccessToken(payload.id, userType);
  
  // For refresh token, use JWT_REFRESH_SECRET or fallback to JWT_SECRET
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  const refreshExpiresIn = userType === 'admin' ? '30d' : '7d';
  
  if (!refreshSecret) {
    throw new Error('JWT_SECRET or JWT_REFRESH_SECRET environment variable must be set');
  }
  
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn });
  
  return { accessToken, refreshToken };
};

// --- Set Cookies ---
export const setAuthCookies = (res, accessToken, refreshToken, userType) => {
  const prefix = userType === 'admin' ? 'admin' : 'user';
  
  // Enhanced cookie options for Safari/iOS compatibility
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
    path: '/',
    // Don't set domain for cross-origin cookies - let browser handle it
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined
  };
  
  // Safari-compatible cookie options for better compatibility
  const safariCompatibleOptions = {
    ...cookieOptions,
    // Add explicit SameSite=None for Safari compatibility
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    // Ensure secure flag is set for SameSite=None in production
    secure: process.env.NODE_ENV === 'production' ? true : false,
  };
  
  // Set access token cookie
  res.cookie(`${prefix}AccessToken`, accessToken, {
    ...safariCompatibleOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  
  // Set refresh token cookie
  res.cookie(`${prefix}RefreshToken`, refreshToken, {
    ...safariCompatibleOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  
  // Add fallback headers for Safari/iOS (in case cookies are blocked)
  res.setHeader('X-Auth-Token', accessToken);
  res.setHeader('X-Refresh-Token', refreshToken);
};

// --- Clear Cookies ---
export const clearAuthCookies = (res, userType) => {
  const prefix = userType === 'admin' ? 'admin' : 'user';
  
  // Clear cookies with the same options used when setting them
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
  
  res.clearCookie(`${prefix}AccessToken`, clearOptions);
  res.clearCookie(`${prefix}RefreshToken`, clearOptions);
  
  // Also clear any fallback headers
  res.removeHeader('X-Auth-Token');
  res.removeHeader('X-Refresh-Token');
};

// --- Main Token Creation and Sending Function ---
export const createSendTokens = async (user, statusCode, res, req, userType = 'user') => {
  try {
    const prefix = userType === 'admin' ? 'admin' : 'user';
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id, userType);
    const refreshToken = await generateRefreshToken(
      user, 
      userType, 
      req.ip, 
      req.get('User-Agent') || 'Unknown'
    );
    
    setAuthCookies(res, accessToken, refreshToken, userType);

    // Remove sensitive data
    const userResponse = user.toObject ? user.toObject() : { ...user };
    delete userResponse.password;
    delete userResponse.loginAttempts;
    delete userResponse.lockUntil;

    // Send response with user data
    const responseData = {
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          department: user.department,
          permissions: user.permissions
        }
      }
    };

    res.status(statusCode).json(responseData);
  } catch (error) {
    throw error;
  }
};

// --- Revoke All Refresh Tokens ---
export const revokeAllRefreshTokens = async (userId, userType = 'user') => {
  try {
    const query = userType === 'admin' ? { admin: userId } : { user: userId };
    
    // Delete all refresh tokens for the user
    const result = await RefreshToken.deleteMany(query);
    
    console.log(`🗑️ [Token Utils] Revoked ${result.deletedCount} refresh tokens for ${userType} ${userId}`);
    
    return result;
  } catch (error) {
    console.error('❌ [Token Utils] Failed to revoke refresh tokens:', error);
    throw error;
  }
};

// --- Extract Tokens from Cookies ---
export const extractTokensFromCookies = (req, userType = 'user') => {
  const prefix = userType === 'admin' ? 'admin' : 'user';
  return {
    accessToken: req.cookies[`${prefix}AccessToken`],
    refreshToken: req.cookies[`${prefix}RefreshToken`]
  };
};