import express from 'express';
import upload, { uploadProductFiles, processAndUploadFiles } from '../middleware/upload.js';
import { protectAdmin } from '../middleware/auth.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Protect all upload routes
router.use(protectAdmin);

// Upload mixed files (images and videos) for products
router.post('/product-files', uploadProductFiles, catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files provided', 400));
  }

  if (req.files.length > 6) {
    return next(new AppError('Maximum 6 files allowed', 400));
  }

  try {
    const uploadResults = await processAndUploadFiles(req.files, 'hash/products');
    
    res.status(200).json({
      status: 'success',
      data: {
        files: uploadResults
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return next(new AppError('Failed to upload files', 500));
  }
}));

// Upload multiple images
router.post('/images', upload.array('images', 10), catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No images provided', 400));
  }

  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      cloudinary.v2.uploader.upload_stream(
        {
          folder: 'hash/uploads',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id
            });
          }
        }
      ).end(file.buffer);
    });
  });

  try {
    const uploadResults = await Promise.all(uploadPromises);
    
    res.status(200).json({
      status: 'success',
      data: {
        images: uploadResults
      }
    });
  } catch (error) {
    return next(new AppError('Failed to upload images', 500));
  }
}));

// Delete image
router.delete('/images', catchAsync(async (req, res, next) => {
  const { imageUrl, publicId } = req.body;
  
  if (!publicId && !imageUrl) {
    return next(new AppError('Image URL or public ID is required', 400));
  }

  try {
    let idToDelete = publicId;
    
    // Extract public ID from URL if not provided
    if (!publicId && imageUrl) {
      const urlParts = imageUrl.split('/');
      const fileNameWithExtension = urlParts.pop();
      const fileName = fileNameWithExtension.split('.')[0];
      idToDelete = `hash/uploads/${fileName}`;
    }

    await cloudinary.v2.uploader.destroy(idToDelete);
    
    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  } catch (error) {
    return next(new AppError('Failed to delete image', 500));
  }
}));

export default router; 