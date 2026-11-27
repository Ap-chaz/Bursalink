import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const cloudinaryUrl = process.env.CLOUDINARY_URL;

const isConfigured = Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));

if (isConfigured) {
  if (!cloudinaryUrl) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
  }
}

export function isCloudinaryConfigured() {
  return isConfigured;
}

/**
 * Upload an in-memory file buffer directly to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Upload options (folder, resource_type, format)
 * @returns {Promise<Object>} Cloudinary upload result
 */
export async function uploadBuffer(buffer, options = {}) {
  if (!isConfigured) {
    // In test or local dev without credentials, gracefully simulate storage
    if (process.env.NODE_ENV === 'test' || process.env.ALLOW_MOCK_STORAGE === 'true' || process.env.NODE_ENV !== 'production') {
      const ext = options.format || 'jpg';
      const fakeId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        secure_url: `https://res.cloudinary.com/bursalink-demo/image/upload/v1/${options.folder || 'bursalink/docs'}/${fakeId}.${ext}`,
        public_id: `${options.folder || 'bursalink/docs'}/${fakeId}`,
        format: ext,
        bytes: buffer.length
      };
    }
    throw new Error('Cloudinary storage is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'bursalink/docs',
        resource_type: options.resource_type || 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    import('stream').then(({ Readable }) => {
      Readable.from(buffer).pipe(uploadStream);
    }).catch(reject);
  });
}

/**
 * Delete a file from Cloudinary by its publicId
 * @param {string} publicId
 * @param {Object} options
 */
export async function deleteFile(publicId, options = {}) {
  if (!isConfigured) {
    return { result: 'ok' };
  }
  return await cloudinary.uploader.destroy(publicId, options);
}

export { cloudinary };
