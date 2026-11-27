import path from 'path';
import { uploadBuffer, deleteFile } from '../config/cloudinary.js';
import { logAudit } from '../services/auditService.js';

function sanitizeFilename(originalName = '') {
  const base = path.basename(originalName).replace(/[^\w.-]/g, '_');
  return base.slice(0, 120) || 'document';
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose a document to upload.' });
    }

    const userId = req.user?.id || 'anonymous';
    const folder = `bursalink/docs/user_${userId}`;
    const cleanName = sanitizeFilename(req.file.originalname);
    const isPdf = req.file.mimetype === 'application/pdf';

    const result = await uploadBuffer(req.file.buffer, {
      folder,
      resource_type: isPdf ? 'auto' : 'image'
    });

    await logAudit('DOCUMENT_UPLOADED', {
      userId: req.user?.id,
      details: {
        filename: cleanName,
        size: req.file.size,
        mimetype: req.file.mimetype,
        publicId: result.public_id
      },
      req
    });

    return res.status(200).json({
      success: true,
      file: {
        name: cleanName,
        size: req.file.size,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format || (isPdf ? 'pdf' : 'jpg')
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const { publicId } = req.body;
    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ error: 'publicId is required' });
    }

    const userId = req.user?.id;
    const isOwner = publicId.startsWith(`bursalink/docs/user_${userId}/`);
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to delete this document.' });
    }

    await deleteFile(publicId);

    await logAudit('DOCUMENT_DELETED', {
      userId,
      details: { publicId },
      req
    });

    return res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
}
