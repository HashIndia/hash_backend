const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if admin exists and is active
    const admin = await Admin.findById(decoded.admin.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.admin = decoded.admin;
    next();
  } catch (err) {
    console.error('Admin auth middleware error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
