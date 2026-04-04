const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

// @desc    Upload files
// @access  Private
exports.uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        // Dynamically import file-type for ESM compatibility
        let fileTypeFromBuffer;
        try {
            const fileType = await import('file-type');
            fileTypeFromBuffer = fileType.fileTypeFromBuffer;
        } catch (err) {
            // Fallback for test environment
            fileTypeFromBuffer = () => ({ mime: 'application/octet-stream' });
        }

        // Server-side MIME validation via file-type (byte-level, mandatory)
        const validatedFiles = [];
        const rejectedFiles = [];

        for (const file of req.files) {
            // Check file extension first (blocklist approach)
            const ext = path.extname(file.originalname).toLowerCase();
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                fs.unlink(file.path, () => { });
                rejectedFiles.push(`${file.originalname} (invalid extension)`);
                continue;
            }

            // Mandatory byte-level MIME type detection
            try {
                const buffer = fs.readFileSync(file.path);
                const detected = await fileTypeFromBuffer(buffer);
                if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
                    fs.unlink(file.path, () => { });
                    rejectedFiles.push(`${file.originalname} (detected: ${detected?.mime || 'unknown'})`);
                    continue;
                }
            } catch (err) {
                logger.warn(`MIME detection error for ${file.originalname}: ${err.message}`);
                fs.unlink(file.path, () => { });
                rejectedFiles.push(`${file.originalname} (detection failed)`);
                continue;
            }
            validatedFiles.push(file);
        }

        if (rejectedFiles.length > 0 && validatedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: `File type validation failed. Only JPEG, PNG, GIF, and WebP images are accepted. Rejected: ${rejectedFiles.join(', ')}`
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
            response.warnings = `${rejectedFiles.length} file(s) were rejected: ${rejectedFiles.join(', ')}`;
        }
        res.json(response);
    } catch (error) {
        logger.error('Upload error: ' + error.message);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};
