const bcrypt = require("bcryptjs");
const pool = require("../config/database");

async function seedDatabase() {
  const dbClient = await pool.connect();

  try {
    await dbClient.query("BEGIN");

    console.log("🌱 Iniciando seed de produção...");

    // 1. Criar APENAS o usuário administrador principal
    // TROQUE 'sua_senha_segura' PELA SENHA QUE VOCÊ DESEJA PARA O ADMIN
    const adminPassword = await bcrypt.hash("Fusion123", 10);
    
    await dbClient.query(
      `
      INSERT INTO users (name, email, password_hash, role, permissions, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        password_hash = EXCLUDED.password_hash
    `,
      [
        "Administrador",
        "admin@fusionclinic.com", // Você também pode mudar este email se quiser
        adminPassword,
        "admin",
        ["marketing", "pre-sales", "sales", "onboarding", "ongoing"],
        true,
      ]
    );
    console.log("✅ Usuário administrador principal criado/atualizado com sucesso.");

    // As seções abaixo foram removidas para não popular o banco com dados de exemplo.
    // console.log("✅ Usuários de exemplo criados");
    // console.log("✅ Leads de exemplo criados");
    // console.log("✅ Clientes de exemplo criados");
    // console.log("✅ Metas de exemplo criadas");

    await dbClient.query("COMMIT");
    console.log("🎉 Seed de produção concluído com sucesso!");

  } catch (error) {
    if (dbClient) {
        try {
            await dbClient.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("❌ Erro ao tentar fazer rollback:", rollbackError);
        }
    }
    console.error("❌ Erro no seed de produção:", error);
    throw error;
  } finally {
    if (dbClient) {
      dbClient.release();
      console.log("🔌 Cliente do banco de dados liberado.");
    }
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seed finalizado com sucesso, saindo.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed falhou, saindo com erro:", err);
      process.exit(1);
    });
}

module.exports = seedDatabase;