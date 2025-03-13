require("dotenv").config();
const express = require("express");
const cors = require("cors");
const setupSwagger = require("./swagger");
const { startWhatsApp } = require("./services/whatsappService"); // Pisahkan layanan WhatsApp

// Import Routes
const messageRoutes = require("./routes/messageRoutes");
const otpRoutes = require("./routes/otpRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const sessionRoutes = require("./routes/sessionRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Swagger Docs
setupSwagger(app);

// Routes
app.use("/api", messageRoutes);
app.use("/api", otpRoutes);
app.use("/api", approvalRoutes);
app.use("/api", sessionRoutes);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 WhatsApp API Running...");
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📜 Swagger Docs: http://localhost:${PORT}/api-docs`);
  await startWhatsApp();
});
