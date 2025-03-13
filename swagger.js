const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp API",
      version: "1.0.0",
      description: "API untuk mengelola WhatsApp",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./routes/*.js"], // Sesuaikan path ini
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
