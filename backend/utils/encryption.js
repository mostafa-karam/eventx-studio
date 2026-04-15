const crypto = require('crypto');
const config = require('../config');
const logger = require('./logger');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

// Require a dedicated encryption key (never fall back to JWT secrets).
if (!config.secrets.sessionEncryption) {
    throw new Error('Missing SESSION_ENCRYPTION_KEY (required for encryption at rest/in transit fields).');
}
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(config.secrets.sessionEncryption)).digest();

exports.encrypt = (text) => {
    if (!text) return text;
    try {
        const stringText = typeof text === 'object' ? JSON.stringify(text) : String(text);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(stringText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (e) {
        logger.error('Encryption failed: ' + e.message);
        throw e;
    }
};

exports.decrypt = (text) => {
    if (!text || typeof text !== 'string' || !text.includes(':')) return text;
    try {
        const parts = text.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid ciphertext format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
            throw new Error('Invalid ciphertext parameters');
        }
        
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        try {
            return JSON.parse(decrypted);
        } catch (e) {
            return decrypted;
        }
    } catch (error) {
        logger.error('Decryption failed: ' + error.message);
        throw error;
    }
};
