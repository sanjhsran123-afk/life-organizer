import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { MessageModel } from '../models/Message.js';
import { FriendshipModel, getPairKey } from '../models/Friendship.js';
import { isR2Configured, uploadFileToR2, generateDownloadUrl } from '../services/r2Service.js';
import { emitLiveMessage, emitLiveMessageRead } from '../services/socketService.js';
import { sendPushToUser } from '../services/pushService.js';

const router = express.Router();

// Strict rule: Communication is strictly forbidden unless both users are accepted friends
async function assertAcceptedFriendship(userId, friendId) {
  if (!userId || !friendId || userId === friendId) {
    const error = new Error('Invalid friend communication parameters.');
    error.statusCode = 400;
    throw error;
  }
  const pairKey = getPairKey(userId, friendId);
  const friendship = await FriendshipModel.findOne({ pairKey, status: 'accepted' });
  if (!friendship) {
    const error = new Error('You can only communicate with accepted friends.');
    error.statusCode = 403;
    throw error;
  }
  return { friendship, pairKey };
}

// Multer memory storage configuration for file attachments
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Megabytes

const ALLOWED_MIME_TYPES = new Set([
  // Documents & PDFs
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Common Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, Text, CSV, and Images (JPEG, PNG, WebP, GIF).'));
    }
  },
});

// Safe Multer upload middleware: handles oversized files and invalid multipart requests with JSON errors
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum limit of 15MB.' });
        }
        return res.status(400).json({ error: `Upload rejected: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
};

/**
 * Verifies that the raw buffer bytes match the declared file type.
 * Protects against spoofed MIME types, executable files disguised as images/documents, and empty uploads.
 *
 * @param {Buffer} buffer
 * @param {string} declaredMime
 * @param {string} originalName
 * @returns {{ valid: boolean, error?: string, verifiedMime?: string }}
 */
function verifyActualFileType(buffer, declaredMime, originalName) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Uploaded file is empty.' };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds maximum limit of 15MB.' };
  }

  const ext = (originalName.split('.').pop() || '').toLowerCase();

  // 1. PDF: Must begin with %PDF (bytes 25 50 44 46)
  if (declaredMime === 'application/pdf' || ext === 'pdf') {
    if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF') {
      return { valid: true, verifiedMime: 'application/pdf' };
    }
    return { valid: false, error: 'File content does not match a valid PDF document.' };
  }

  // 2. JPEG: Must begin with FF D8 FF
  if (declaredMime === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { valid: true, verifiedMime: 'image/jpeg' };
    }
    return { valid: false, error: 'File content does not match a valid JPEG image.' };
  }

  // 3. PNG: Must begin with 89 50 4E 47 0D 0A 1A 0A
  if (declaredMime === 'image/png' || ext === 'png') {
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { valid: true, verifiedMime: 'image/png' };
    }
    return { valid: false, error: 'File content does not match a valid PNG image.' };
  }

  // 4. GIF: Must begin with GIF87a or GIF89a
  if (declaredMime === 'image/gif' || ext === 'gif') {
    if (
      buffer.length >= 6 &&
      (buffer.slice(0, 6).toString('ascii') === 'GIF87a' ||
        buffer.slice(0, 6).toString('ascii') === 'GIF89a')
    ) {
      return { valid: true, verifiedMime: 'image/gif' };
    }
    return { valid: false, error: 'File content does not match a valid GIF image.' };
  }

  // 5. WebP: RIFF at 0..3 and WEBP at 8..11
  if (declaredMime === 'image/webp' || ext === 'webp') {
    if (
      buffer.length >= 12 &&
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { valid: true, verifiedMime: 'image/webp' };
    }
    return { valid: false, error: 'File content does not match a valid WebP image.' };
  }

  // 6. Microsoft Office OpenXML (ZIP container: .docx, .xlsx, .pptx)
  // PK Zip magic bytes: 50 4B 03 04 (or 05 06 / 07 08)
  const isZipContainer =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

  const openXmlMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
  ];

  if (openXmlMimes.includes(declaredMime) || ['docx', 'xlsx', 'pptx'].includes(ext)) {
    if (isZipContainer) {
      return { valid: true, verifiedMime: declaredMime };
    }
    return { valid: false, error: 'File content does not match a valid Office OpenXML document.' };
  }

  // 7. Microsoft Office Legacy Binary (Compound File Binary Format: .doc, .xls, .ppt)
  // CFB magic bytes: D0 CF 11 E0 A1 B1 1A E1
  const isLegacyOfficeCfb =
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1;

  const legacyOfficeMimes = [
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ];

  if (legacyOfficeMimes.includes(declaredMime) || ['doc', 'xls', 'ppt'].includes(ext)) {
    if (isLegacyOfficeCfb) {
      return { valid: true, verifiedMime: declaredMime };
    }
    return { valid: false, error: 'File content does not match a valid Microsoft Office document.' };
  }

  // 8. Plain Text / CSV (.txt, .csv)
  if (['text/plain', 'text/csv'].includes(declaredMime) || ['txt', 'csv'].includes(ext)) {
    // Text inspection: ensure no binary null bytes (0x00) exist in the initial sample
    const sampleSize = Math.min(buffer.length, 4096);
    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0x00) {
        return { valid: false, error: 'Binary content detected in text file.' };
      }
    }
    return { valid: true, verifiedMime: declaredMime || 'text/plain' };
  }

  return { valid: false, error: 'Unsupported or unverified file content.' };
}

// All message routes require valid authentication
router.use(requireAuth);

/**
 * GET /api/messages/unread-counts
 * Get map of unread message counts per friend and total unread count
 */
router.get('/unread-counts', async (req, res) => {
  try {
    const unreadAgg = await MessageModel.aggregate([
      { $match: { recipientId: req.userId, read: false } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);

    const unreadByFriend = {};
    let totalUnread = 0;

    for (const item of unreadAgg) {
      unreadByFriend[item._id] = item.count;
      totalUnread += item.count;
    }

    res.json({ unreadByFriend, totalUnread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/messages/:friendId
 * Get persistent message history between accepted friends.
 * Automatically marks unread incoming messages as read.
 */
router.get('/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;
    const { pairKey } = await assertAcceptedFriendship(req.userId, friendId);

    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));
    const before = req.query.before ? new Date(req.query.before) : null;

    const query = { pairKey };
    if (before && !isNaN(before.getTime())) {
      query.createdAt = { $lt: before };
    }

    const messages = await MessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark unread messages sent by friend to this user as read
    const unreadIds = messages
      .filter((m) => m.recipientId === req.userId && !m.read)
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      const now = new Date();
      await MessageModel.updateMany(
        { _id: { $in: unreadIds } },
        { $set: { read: true, readAt: now } }
      );
      emitLiveMessageRead(friendId, { pairKey, readAt: now });
    }

    // Return in chronological order (oldest to newest)
    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * POST /api/messages/:friendId
 * Send a 1-to-1 text message to an accepted friend
 */
router.post('/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const cleanText = text.trim();
    if (cleanText.length > 4000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 4000 characters.' });
    }

    const { pairKey } = await assertAcceptedFriendship(req.userId, friendId);

    const message = await MessageModel.create({
      pairKey,
      senderId: req.userId,
      recipientId: friendId,
      type: 'text',
      text: cleanText,
    });

    // Broadcast live to recipient
    emitLiveMessage(friendId, message);

    // Send push notification if recipient has server push configured
    const senderName = req.user?.name || 'A friend';
    sendPushToUser(friendId, {
      title: senderName,
      body: cleanText,
      tag: `msg-${pairKey}`,
      url: '/?tab=friends',
    }).catch(() => {});

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * POST /api/messages/:friendId/files
 * Upload and share a private file attachment (Document, PDF, Image)
 * Content stored exclusively in Cloudflare R2 private bucket.
 * Validates actual byte content against declared MIME type and limits file size to 15MB.
 */
router.post('/:friendId/files', handleUpload, async (req, res) => {
  try {
    const { friendId } = req.params;
    const { pairKey } = await assertAcceptedFriendship(req.userId, friendId);

    // Verify Cloudflare R2 is configured
    if (!isR2Configured()) {
      return res.status(503).json({
        error: 'Private file storage (Cloudflare R2) is not configured on this server. File sharing is currently disabled.',
        code: 'R2_NOT_CONFIGURED',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    const file = req.file;

    // Verify actual file content via magic bytes against declared MIME
    const verification = verifyActualFileType(file.buffer, file.mimetype, file.originalname || '');
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || 'Invalid file format.' });
    }

    const safeMime = verification.verifiedMime || file.mimetype;
    const rawOriginalName = file.originalname || 'attachment';

    // Sanitize filename: remove directory traversal, control characters, and reserved symbols
    const sanitizedName = rawOriginalName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'attachment';
    const safeBaseName = sanitizedName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const r2Key = `messages/${pairKey}/${Date.now()}-${randomSuffix}-${safeBaseName}`;

    // Upload directly to private R2 bucket
    await uploadFileToR2(file.buffer, r2Key, safeMime, {
      senderId: req.userId,
      recipientId: friendId,
      originalName: encodeURIComponent(sanitizedName),
    });

    const message = await MessageModel.create({
      pairKey,
      senderId: req.userId,
      recipientId: friendId,
      type: 'file',
      text: sanitizedName,
      file: {
        key: r2Key,
        name: sanitizedName,
        size: file.size,
        mimeType: safeMime,
      },
    });

    // Broadcast live to recipient
    emitLiveMessage(friendId, message);

    // Background push notification
    const senderName = req.user?.name || 'A friend';
    sendPushToUser(friendId, {
      title: senderName,
      body: `Shared a file: ${sanitizedName}`,
      tag: `msg-${pairKey}`,
      url: '/?tab=friends',
    }).catch(() => {});

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * GET /api/messages/files/:messageId/download
 * Generates an authenticated, short-lived (5-minute) download URL for a private R2 file.
 * Requires both users to be accepted friends; blocked or unfriended users cannot download.
 */
router.get('/files/:messageId/download', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await MessageModel.findById(messageId);

    if (!message || message.type !== 'file' || !message.file?.key) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Only sender and recipient can download
    if (message.senderId !== req.userId && message.recipientId !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to download this file.' });
    }

    // Verify both users are currently accepted friends (if unfriended/blocked, download is forbidden)
    const otherUserId = message.senderId === req.userId ? message.recipientId : message.senderId;
    await assertAcceptedFriendship(req.userId, otherUserId);

    if (!isR2Configured()) {
      return res.status(503).json({
        error: 'Private file storage is not configured on this server.',
        code: 'R2_NOT_CONFIGURED',
      });
    }

    const downloadUrl = await generateDownloadUrl(message.file.key, message.file.name, 300);

    if (req.query.redirect === '1') {
      return res.redirect(downloadUrl);
    }

    res.json({
      downloadUrl,
      fileName: message.file.name,
      expiresIn: 300,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
