const { Pool } = require("pg")
require("dotenv").config()

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "fusionclinic",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection
pool.on("connect", () => {
  console.log("✅ Conectado ao PostgreSQL")
})

pool.on("error", (err) => {
  console.error("❌ Erro na conexão com PostgreSQL:", err)
})

module.exports = pool
