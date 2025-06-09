#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🚀 Configurando FusionClinic Backend...\n")

// 1. Verificar se o .env existe
const envPath = path.join(__dirname, "..", "..", ".env")
if (!fs.existsSync(envPath)) {
  console.log("📝 Criando arquivo .env...")
  const envExamplePath = path.join(__dirname, "..", "..", ".env.example")
  fs.copyFileSync(envExamplePath, envPath)
  console.log("✅ Arquivo .env criado! Configure suas variáveis de ambiente.\n")
}

// 2. Instalar dependências
console.log("📦 Instalando dependências...")
try {
  execSync("npm install", { stdio: "inherit" })
  console.log("✅ Dependências instaladas!\n")
} catch (error) {
  console.error("❌ Erro ao instalar dependências:", error.message)
  process.exit(1)
}

// 3. Executar migrações
console.log("🗄️ Executando migrações do banco...")
try {
  execSync("npm run migrate", { stdio: "inherit" })
  console.log("✅ Migrações executadas!\n")
} catch (error) {
  console.error("❌ Erro nas migrações. Verifique a conexão com o banco.")
  console.error("Certifique-se de que o PostgreSQL está rodando e as configurações estão corretas no .env\n")
}

// 4. Executar seed
console.log("🌱 Executando seed do banco...")
try {
  execSync("npm run seed", { stdio: "inherit" })
  console.log("✅ Seed executado!\n")
} catch (error) {
  console.error("❌ Erro no seed:", error.message)
}

console.log("🎉 Setup concluído!")
console.log("\n📋 Próximos passos:")
console.log("1. Configure o arquivo .env com suas credenciais")
console.log("2. Execute: npm run dev")
console.log("3. Acesse: http://localhost:3001/health")
console.log("\n👤 Usuário admin padrão:")
console.log("Email: admin@fusionclinic.com")
console.log("Senha: admin123")
