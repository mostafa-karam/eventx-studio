const logger = require('../utils/logger');

// @desc    Upload files
// @access  Private
exports.uploadFiles = (req, res) => {
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
};
