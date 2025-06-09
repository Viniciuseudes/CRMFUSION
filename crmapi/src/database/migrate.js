const fs = require("fs")
const path = require("path")
const pool = require("../config/database")

async function runMigrations() {
  try {
    console.log("🔄 Executando migrações...")

    const schemaPath = path.join(__dirname, "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    await pool.query(schema)

    console.log("✅ Migrações executadas com sucesso!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Erro ao executar migrações:", error)
    process.exit(1)
  }
}

if (require.main === module) {
  runMigrations()
}

module.exports = runMigrations
