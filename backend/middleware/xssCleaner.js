const sanitizeHtml = require('sanitize-html');

/**
 * Custom XSS cleaner middleware
 * Cleans req.body, req.query, and req.params using sanitize-html.
 */

const options = {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {}, // Strip all attributes
};

const clean = (data) => {
    if (typeof data === 'string') {
        return sanitizeHtml(data, options);
    }
    if (Array.isArray(data)) {
        return data.map((item) => clean(item));
    }
    if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach((key) => {
            data[key] = clean(data[key]);
        });
    }
    return data;
};

const xssCleaner = () => {
    return (req, res, next) => {
        if (req.body) req.body = clean(req.body);
        if (req.query) req.query = clean(req.query);
        if (req.params) req.params = clean(req.params);
        next();
    };
};

module.exports = xssCleaner;
