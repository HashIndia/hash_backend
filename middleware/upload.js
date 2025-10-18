import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import AppError from '../utils/appError.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hash/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1000, height: 1000, crop: 'limit' }
    ]
  }
});

// Cloudinary storage for product videos
const productVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hash/products/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1000, height: 1000, crop: 'limit' }
    ]
  }
});

// Mixed storage for products (images and videos)
const productMixedStorage = multer.memoryStorage();

// Cloudinary storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hash/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }
    ]
  }
});

// File filter function for images and videos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type! Please upload only images or videos.', 400), false);
  }
};

// Multer upload for product images
const uploadProductImages = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Maximum 10 files
  }
});

// Multer upload for single avatar
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
});

// Multer upload for general images
const uploadImage = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// Memory storage for processing before upload
const memoryStorage = multer.memoryStorage();

const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  }
});

// Upload multiple product images
const uploadProductImagesHandler = uploadProductImages.array('images', 10);

// Upload single avatar
const uploadAvatarHandler = uploadAvatar.single('avatar');

// Upload single image
const uploadImageHandler = uploadImage.single('image');

// Upload to memory for processing
const uploadToMemoryHandler = uploadToMemory.array('images', 10);

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File is too large.', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files were uploaded.', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field name for file upload.', 400));
    }
  }
  next(err);
};

// Upload images to Cloudinary from buffer
const uploadToCloudinary = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      folder: 'hash/uploads',
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new AppError('Failed to delete image', 500);
  }
};

// Extract public ID from Cloudinary URL
const extractPublicId = (url) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const publicId = filename.split('.')[0];
  return `${parts[parts.length - 2]}/${publicId}`;
};

// Resize and upload multiple images
const processAndUploadImages = async (files, folder = 'hash/products') => {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map(async (file) => {
    const options = {
      folder,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1000, height: 1000, crop: 'limit' }
      ]
    };

    const result = await uploadToCloudinary(file.buffer, options);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    };
  });

  return Promise.all(uploadPromises);
};

// Generate optimized image URLs
const generateImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto'
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

// Generate responsive image URLs
const generateResponsiveUrls = (publicId) => {
  return {
    thumbnail: generateImageUrl(publicId, { width: 150, height: 150, crop: 'fill' }),
    small: generateImageUrl(publicId, { width: 300, height: 300, crop: 'limit' }),
    medium: generateImageUrl(publicId, { width: 600, height: 600, crop: 'limit' }),
    large: generateImageUrl(publicId, { width: 1000, height: 1000, crop: 'limit' }),
    original: generateImageUrl(publicId)
  };
};

// Upload mixed files (images and videos) to memory for processing
const uploadProductFiles = multer({
  storage: productMixedStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 6 // Maximum 6 files
  }
}).array('files', 6);

// Process and upload mixed files (images and videos)
const processAndUploadFiles = async (files, folder = 'hash/products') => {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map(async (file) => {
    const isVideo = file.mimetype.startsWith('video/');
    
    const options = {
      folder: isVideo ? `${folder}/videos` : folder,
      resource_type: isVideo ? 'video' : 'image',
      transformation: isVideo 
        ? [
            { quality: 'auto' },
            { width: 1000, height: 1000, crop: 'limit' }
          ]
        : [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1000, height: 1000, crop: 'limit' }
          ]
    };

    const result = await uploadToCloudinary(file.buffer, options);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      type: isVideo ? 'video' : 'image',
      format: result.format,
      duration: result.duration || null
    };
  });

  return Promise.all(uploadPromises);
};

export default uploadProductImages;
export {
  uploadProductImages,
  uploadAvatar,
  uploadImage,
  uploadToMemory,
  uploadProductFiles,
  uploadProductImagesHandler,
  uploadAvatarHandler,
  uploadImageHandler,
  uploadToMemoryHandler,
  handleMulterError,
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
  processAndUploadImages,
  processAndUploadFiles,
  generateImageUrl,
  generateResponsiveUrls
};