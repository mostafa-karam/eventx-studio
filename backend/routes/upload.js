const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
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
router.post('/', authenticate, upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const baseUrl = process.env.BACKEND_URL ||
            `${req.protocol}://${req.get('host')}`;

        const urls = req.files.map(file => ({
            url: `${baseUrl}/uploads/${file.filename}`,
            alt: file.originalname.replace(/\.[^.]+$/, ''),
            filename: file.filename,
        }));

        res.json({ success: true, message: 'File(s) uploaded successfully', data: { images: urls } });
    } catch (error) {
        logger.error('Upload error: ' + error.message);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

// Handle multer errors (e.g. file too large, wrong type)
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError || err.message) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Upload failed' });
});

module.exports = router;
