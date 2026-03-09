const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// @desc    Upload files
// @access  Private
exports.uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        // Server-side MIME validation via file-type (byte-level, not extension-based)
        let fileTypeModule;
        try {
            fileTypeModule = await import('file-type');
        } catch {
            // file-type not installed — skip byte-level check but log warning
            logger.warn('file-type package not installed. Skipping MIME byte-level validation.');
            fileTypeModule = null;
        }

        const validatedFiles = [];
        const rejectedFiles = [];

        for (const file of req.files) {
            if (fileTypeModule) {
                const buffer = fs.readFileSync(file.path);
                const detected = await fileTypeModule.fileTypeFromBuffer(buffer);
                if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
                    // Remove invalid file from disk
                    fs.unlink(file.path, () => { });
                    rejectedFiles.push(file.originalname);
                    continue;
                }
            }
            validatedFiles.push(file);
        }

        if (rejectedFiles.length > 0 && validatedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: `File type not allowed. Only JPEG, PNG, GIF, and WebP images are accepted. Rejected: ${rejectedFiles.join(', ')}`
            });
        }

        const baseUrl = process.env.BACKEND_URL ||
            `${req.protocol}://${req.get('host')}`;

        const urls = validatedFiles.map(file => ({
            url: `${baseUrl}/uploads/${file.filename}`,
            alt: file.originalname.replace(/\.[^.]+$/, ''),
            filename: file.filename,
        }));

        const response = { success: true, message: 'File(s) uploaded successfully', data: { images: urls } };
        if (rejectedFiles.length > 0) {
            response.warnings = `${rejectedFiles.length} file(s) were rejected due to invalid type: ${rejectedFiles.join(', ')}`;
        }
        res.json(response);
    } catch (error) {
        logger.error('Upload error: ' + error.message);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};
