const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const AppError = require('../utils/AppError');

/**
 * Uploads a profile photo buffer to Cloudinary (or falls back to safe data-URI if not yet configured)
 * @param {Object} params - { buffer, mimetype, userId }
 * @returns {Promise<{ url: string, publicId: string|null, isCloudinary: boolean }>}
 */
exports.uploadProfilePhoto = async ({ buffer, mimetype, userId }) => {
  if (!buffer || buffer.length === 0) {
    throw new AppError('No image buffer provided for upload', 400);
  }

  // If Cloudinary credentials are provided, perform real secure upload
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ai_lifeos/avatars',
          public_id: `user_${userId}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { width: 400, height: 400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
          ],
          tags: ['ai_lifeos_avatar', `user_${userId}`]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new AppError('Failed to upload image to Cloudinary: ' + (error.message || 'Unknown error'), 502));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            isCloudinary: true
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Graceful fallback if Cloudinary credentials have not been pasted yet
  console.log('ℹ Cloudinary credentials not yet provided in .env; saving optimized data URI fallback.');
  const base64Data = buffer.toString('base64');
  const dataUri = `data:${mimetype || 'image/jpeg'};base64,${base64Data}`;
  return {
    url: dataUri,
    publicId: null,
    isCloudinary: false
  };
};

/**
 * Deletes an old Cloudinary asset safely after a new photo upload succeeds
 * @param {string} publicId - The Cloudinary asset public ID
 */
exports.deleteCloudinaryPhoto = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`✓ Deleted old Cloudinary asset: ${publicId}`);
  } catch (err) {
    console.warn(`Could not delete old Cloudinary asset ${publicId}:`, err.message);
  }
};
