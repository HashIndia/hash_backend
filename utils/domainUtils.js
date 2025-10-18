// Domain utility functions for consistent URL construction
import dotenv from 'dotenv';
dotenv.config();

/**
 * Get the custom domain from environment variables
 * @returns {string} The custom domain (e.g., 'hashindia.in')
 */
export const getCustomDomain = () => {
  return process.env.CUSTOM_DOMAIN || 'hashindia.in';
};

/**
 * Get the frontend URL using the custom domain
 * @param {boolean} withWww - Whether to include 'www' subdomain
 * @returns {string} The complete frontend URL
 */
export const getFrontendUrl = (withWww = true) => {
  const domain = getCustomDomain();
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const subdomain = withWww ? 'www.' : '';
  
  // Use environment variable if available, otherwise construct from domain
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  return `${protocol}://${subdomain}${domain}`;
};

/**
 * Get all allowed origins for CORS configuration
 * @returns {string[]} Array of allowed origin URLs
 */
export const getAllowedOrigins = () => {
  const origins = [];
  const domain = getCustomDomain();
  
  // Add environment-specified origins
  if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
  if (process.env.ADMIN_URL) origins.push(process.env.ADMIN_URL);
  
  // Add custom domain variations
  origins.push(`https://www.${domain}`);
  origins.push(`https://${domain}`);
  
  // Add development URLs if not in production
  if (process.env.NODE_ENV !== 'production') {
    origins.push(`http://www.${domain}`);
    origins.push(`http://${domain}`);
    origins.push('http://localhost:3000');
    origins.push('http://localhost:5173');
  }
  
  // Add any additional origins from environment variable
  if (process.env.ADDITIONAL_ORIGINS) {
    const additionalOrigins = process.env.ADDITIONAL_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...additionalOrigins);
  }
  
  return origins.filter(Boolean); // Remove any undefined URLs
};

/**
 * Get admin URL using the custom domain
 * @returns {string} The complete admin URL
 */
export const getAdminUrl = () => {
  if (process.env.ADMIN_URL) {
    return process.env.ADMIN_URL;
  }
  
  const domain = getCustomDomain();
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://admin.${domain}`;
};

/**
 * Construct a reset password URL
 * @param {string} resetToken - The password reset token
 * @returns {string} Complete reset password URL
 */
export const getResetPasswordUrl = (resetToken) => {
  const frontendUrl = getFrontendUrl();
  return `${frontendUrl}/reset-password/${resetToken}`;
};

/**
 * Construct various application URLs
 * @param {string} path - The path to append (e.g., '/shop', '/orders')
 * @returns {string} Complete URL
 */
export const getAppUrl = (path = '') => {
  const frontendUrl = getFrontendUrl();
  return `${frontendUrl}${path}`;
};

export default {
  getCustomDomain,
  getFrontendUrl,
  getAllowedOrigins,
  getAdminUrl,
  getResetPasswordUrl,
  getAppUrl
};
