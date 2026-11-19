import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { uploadDir } from '../middleware/upload.js';

const useCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function ensureLocalDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function getBuffer(file) {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFileSync(file.path);
  throw new Error('Uploaded file has no content');
}

/**
 * Persist an uploaded multer file and return a durable public URL/path.
 * Uses Cloudinary when configured; otherwise writes to local uploads/.
 */
export async function persistUploadedFile(file) {
  if (!file) return undefined;

  const buffer = getBuffer(file);
  const originalName = file.originalname || file.filename || 'upload';
  const ext = path.extname(originalName).toLowerCase() || '';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const mimeType = file.mimetype || 'application/octet-stream';

  if (useCloudinary) {
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: process.env.CLOUDINARY_FOLDER || 'dosewise',
      public_id: path.parse(unique).name,
      resource_type: 'auto',
    });
    return result.secure_url;
  }

  ensureLocalDir();
  const localPath = path.join(uploadDir, unique);
  fs.writeFileSync(localPath, buffer);
  file.filename = unique;
  file.path = localPath;
  return `/uploads/${unique}`;
}

export function isCloudStorageEnabled() {
  return useCloudinary;
}
