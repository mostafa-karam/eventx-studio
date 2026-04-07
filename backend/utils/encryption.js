const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

// Generate a valid 32 byte key using SHA-256 hash of the JWT_SECRET
const keyBase = config.secrets.sessionEncryption || config.secrets.jwt;
const ENCRYPTION_KEY = crypto.createHash('sha256').update(keyBase).digest();

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
        return text;
    }
};

exports.decrypt = (text) => {
    if (!text || typeof text !== 'string' || !text.includes(':')) return text;
    try {
        const parts = text.split(':');
        if (parts.length !== 3) return text;

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        
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
        return text;
    }
};
