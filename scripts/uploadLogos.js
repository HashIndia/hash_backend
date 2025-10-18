import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadLogos() {
  try {
    console.log('🔄 Uploading logo images to Cloudinary...');

    // Upload hash-logo.jpg
    const logoResult = await cloudinary.uploader.upload(
      path.join(__dirname, '../frontend/public/hash-logo.jpg'),
      {
        public_id: 'hash/email/hash-logo',
        folder: 'hash/email',
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { height: 100, crop: 'scale' }
        ]
      }
    );

    // Upload hash-logo-text.jpg
    const logoTextResult = await cloudinary.uploader.upload(
      path.join(__dirname, '../frontend/public/hash-logo-text.jpg'),
      {
        public_id: 'hash/email/hash-logo-text',
        folder: 'hash/email',
        overwrite: true,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { height: 100, crop: 'scale' }
        ]
      }
    );

    console.log('✅ Logo images uploaded successfully!');
    console.log('📷 Hash Logo URL:', logoResult.secure_url);
    console.log('📷 Hash Text Logo URL:', logoTextResult.secure_url);

    return {
      logoUrl: logoResult.secure_url,
      logoTextUrl: logoTextResult.secure_url
    };

  } catch (error) {
    console.error('❌ Error uploading logos:', error);
    throw error;
  }
}

// Run the upload if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  uploadLogos()
    .then((urls) => {
      console.log('\n🎉 Upload complete! You can now use these URLs in your email templates:');
      console.log(`Hash Logo: ${urls.logoUrl}`);
      console.log(`Hash Text Logo: ${urls.logoTextUrl}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to upload logos:', error);
      process.exit(1);
    });
}

export default uploadLogos;
