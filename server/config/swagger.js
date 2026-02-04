import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "PROOV API Documentation",
            version: "1.0.0",
            description: "API documentation for the PROOV backend server",
        },
        servers: [
            {
                url: "http://54.236.227.121.nip.io:5002",
                description: "운영 서버",
            },
            {
                url: "http://localhost:5002",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./server/routes/*.js"], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
