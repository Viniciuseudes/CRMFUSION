const express = require("express")
const bcrypt = require("bcryptjs")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")
const { requireRole } = require("../middleware/auth")

const router = express.Router()

// Listar usuários (apenas admin e gerente)
router.get("/", requireRole(["admin", "gerente"]), async (req, res, next) => {
  try {
    const { role, is_active, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT id, name, email, role, permissions, is_active, last_login, created_at, updated_at
      FROM users
      WHERE 1=1
    `
    const params = []
    let paramCount = 0

    // Filtros opcionais
    if (role) {
      paramCount++
      query += ` AND role = $${paramCount}`
      params.push(role)
    }

    if (is_active !== undefined) {
      paramCount++
      query += ` AND is_active = $${paramCount}`
      params.push(is_active === "true")
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Contar total
    let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1"
    const countParams = []
    let countParamCount = 0

    if (role) {
      countParamCount++
      countQuery += ` AND role = $${countParamCount}`
      countParams.push(role)
    }

    if (is_active !== undefined) {
      countParamCount++
      countQuery += ` AND is_active = $${countParamCount}`
      countParams.push(is_active === "true")
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      users: result.rows,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Buscar usuário por ID
router.get("/:id", requireRole(["admin", "gerente"]), async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT id, name, email, role, permissions, is_active, last_login, created_at, updated_at
      FROM users WHERE id = $1
    `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Atualizar usuário
router.put("/:id", requireRole(["admin"]), validateRequest(schemas.updateUser), async (req, res, next) => {
  try {
    const { id } = req.params

    // Verificar se o usuário existe
    const existingUser = await pool.query("SELECT * FROM users WHERE id = $1", [id])
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    // Construir query de update dinamicamente
    const updates = []
    const values = []
    let paramCount = 0

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        paramCount++
        updates.push(`${key} = $${paramCount}`)
        values.push(req.body[key])
      }
    })

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" })
    }

    paramCount++
    values.push(id)

    const query = `
      UPDATE users 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, email, role, permissions, is_active, last_login, created_at, updated_at
    `

    const result = await pool.query(query, values)

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Deletar usuário
router.delete("/:id", requireRole(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params

    // Não permitir deletar o próprio usuário
    if (id === req.user.id) {
      return res.status(400).json({ error: "Não é possível deletar seu próprio usuário" })
    }

    const existingUser = await pool.query("SELECT * FROM users WHERE id = $1", [id])
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    await pool.query("DELETE FROM users WHERE id = $1", [id])

    res.json({ message: "Usuário removido com sucesso" })
  } catch (error) {
    next(error)
  }
})

// Alterar senha
router.put("/:id/password", async (req, res, next) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body

    // Verificar se é o próprio usuário ou admin
    if (id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Permissão insuficiente" })
    }

    // Validar dados
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" })
    }

    // Se não for admin, verificar senha atual
    if (id === req.user.id && !currentPassword) {
      return res.status(400).json({ error: "Senha atual é obrigatória" })
    }

    // Buscar usuário
    const userResult = await pool.query("SELECT password_hash FROM users WHERE id = $1", [id])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    // Verificar senha atual se necessário
    if (id === req.user.id) {
      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash)
      if (!validPassword) {
        return res.status(400).json({ error: "Senha atual incorreta" })
      }
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Atualizar senha
    await pool.query("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
      newPasswordHash,
      id,
    ])

    res.json({ message: "Senha alterada com sucesso" })
  } catch (error) {
    next(error)
  }
})

// Obter perfil do usuário atual
router.get("/me/profile", async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, role, permissions, is_active, last_login, created_at, updated_at
      FROM users WHERE id = $1
    `,
      [req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Atualizar perfil do usuário atual
router.put("/me/profile", async (req, res, next) => {
  try {
    const { name, email } = req.body

    // Validar dados
    if (!name || name.length < 2) {
      return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" })
    }

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Email deve ter um formato válido" })
    }

    // Verificar se email já está em uso por outro usuário
    const emailCheck = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, req.user.id])

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email já está em uso" })
    }

    // Atualizar perfil
    const result = await pool.query(
      `
      UPDATE users 
      SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, email, role, permissions, is_active, last_login, created_at, updated_at
    `,
      [name, email, req.user.id],
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

module.exports = router
