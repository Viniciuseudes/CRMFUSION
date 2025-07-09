const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const leadRoutes = require("./routes/leads")
const clientRoutes = require("./routes/clients")
const clinicsRouter = require("./routes/clinics");
const goalRoutes = require("./routes/goals")
const activityRoutes = require("./routes/activities")
const reportRoutes = require("./routes/reports")
const { errorHandler } = require("./middleware/errorHandler")
const { authenticateToken } = require("./middleware/auth")
const contractRoutes = require("./routes/contracts");
const basexRoutes = require("./routes/basex");
const roomRoutes = require("./routes/rooms");

const app = express()
const PORT = process.env.PORT || 3001

// Rate limiting AJUSTADO PARA TESTES
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200, 
  message: "Muitas tentativas, tente novamente em breve.",
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Middleware com ORDEM AJUSTADA (CORS antes de limiter)
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));

// CORS vem ANTES do rate limiter
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"], 
  })
);

app.use(limiter); // Rate limiter DEPOIS do CORS

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authenticateToken, userRoutes);
app.use("/api/leads", authenticateToken, leadRoutes);
app.use("/api/clients", authenticateToken, clientRoutes);
app.use("/api/goals", authenticateToken, goalRoutes);
app.use("/api/activities", authenticateToken, activityRoutes);
app.use("/api/reports", authenticateToken, reportRoutes);
app.use("/api/contracts", authenticateToken, contractRoutes);
app.use("/api/clinics", authenticateToken, clinicsRouter);
app.use("/api/rooms", authenticateToken, roomRoutes);
app.use("/api/basex", authenticateToken, basexRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('/{*any}', (req, res, next) => {
  res.status(404).json({ error: "Endpoint não encontrado" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 FusionClinic CRM Backend v1.0.0`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;