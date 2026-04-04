const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EventX Studio API',
            version: '1.0.0',
            description: 'API documentation for EventX Studio Backend',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
            // You can add production server block here as well
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'accessToken',
                },
            },
        },
        security: [
            { bearerAuth: [] },
            { cookieAuth: [] }
        ],
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
