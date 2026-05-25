const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'EventX Studio API',
            version: '2.0.0',
            description: 'Comprehensive API documentation for the EventX Studio Backend. This API handles event management, ticket booking, real-time analytics, and secure user authentication.',
            contact: {
                name: 'API Support',
                email: 'support@eventx-studio.com',
                url: 'https://eventx-studio.com/support'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:5000',
                description: 'Current Environment Server',
            },
            {
                url: 'https://api.eventx-studio.com',
                description: 'Production Server (Mock)',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT access token'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'accessToken',
                    description: 'Session-based authentication via HTTP-only cookie'
                },
                csrfAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-CSRF-Token',
                    description: 'Required for state-changing requests (POST, PUT, DELETE, PATCH)'
                }
            },
        },
        security: [
            { bearerAuth: [] },
            { cookieAuth: [] },
            { csrfAuth: [] }
        ],
        tags: [
            { name: 'Auth', description: 'Authentication & Session Management' },
            { name: 'Events', description: 'Event creation and discovery' },
            { name: 'Booking', description: 'Ticket booking life-cycle' },
            { name: 'Analytics', description: 'Business intelligence and reporting' },
            { name: 'Users', description: 'User management and profiles' },
            { name: 'Tickets', description: 'Ticket operations and lifecycle' },
            { name: 'Payments', description: 'Payment processing and webhooks' },
            { name: 'Notifications', description: 'Push and email notifications' },
            { name: 'Marketing', description: 'Promotions and marketing tools' },
            { name: 'Categories', description: 'Event categories and taxonomy' },
            { name: 'Halls', description: 'Venue and hall management' },
            { name: 'HallBookings', description: 'Hall booking lifecycle' },
            { name: 'Search', description: 'Search endpoints' },
            { name: 'Support', description: 'Support ticketing and helpdesk' },
            { name: 'Upload', description: 'File upload endpoints' },
            { name: 'Coupons', description: 'Coupon management' },
            { name: 'AuditLog', description: 'Audit and logging endpoints' },
            { name: 'Reviews', description: 'Event reviews and ratings' }
        ]
    },
    apis: ['./routes/*.js'], // Path to the file with API annotations
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
    // Only enable Swagger API docs in non-production environments
    if (process.env.NODE_ENV === 'production') {
        return;
    }
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
