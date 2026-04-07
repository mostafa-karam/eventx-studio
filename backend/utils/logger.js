const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists for production file transports
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const appendRequestId = winston.format((info) => {
  if (info.req && info.req.id) {
    info.requestId = info.req.id;
  }
  return info;
});

const devFormat = combine(
    appendRequestId(),
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack, requestId }) => {
        const reqStr = requestId ? ` [ReqID: ${requestId}]` : '';
        return `${timestamp} [${level}]${reqStr} ${stack || message}`;
    })
);

const prodFormat = combine(
    appendRequestId(),
    timestamp(),
    errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new winston.transports.Console(),
        // In production, also write to files
        ...(process.env.NODE_ENV === 'production'
            ? [
                new winston.transports.File({
                    filename: path.join(__dirname, '../logs/error.log'),
                    level: 'error',
                }),
                new winston.transports.File({
                    filename: path.join(__dirname, '../logs/combined.log'),
                }),
            ]
            : []),
    ],
});

module.exports = logger;
