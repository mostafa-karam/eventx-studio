const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { uploadFiles } = require('../controllers/uploadController');

const router = express.Router();

// ─── Upload-specific rate limiter ──────────────────────────────────────────
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // max 30 upload requests per 15 min per user
    message: 'Too many upload requests from this user, please try again later.',
    keyGenerator: (req, _res) => req.user._id.toString(), // per-user limit
});

// ─── Storage Config ─────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = crypto.randomBytes(12).toString('hex');
        cb(null, `${Date.now()}-${unique}${ext}`);
    },
});

const FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
    fileFilter: (_req, file, cb) => {
        if (FILE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
        }
    },
});

// POST /api/upload  — upload one or more images
// FormData field name: 'images' (up to 10)
router.post('/', authenticate, uploadLimiter, upload.array('images', 10), uploadFiles);

// Handle multer errors (e.g. file too large, wrong type)
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError || err.message) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Upload failed' });
});

module.exports = router;
