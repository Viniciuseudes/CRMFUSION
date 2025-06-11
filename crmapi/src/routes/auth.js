const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Login
router.post("/login", validateRequest(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Buscar usuário
    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, permissions, is_active FROM users WHERE email = $1",
      [email],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(401).json({ error: "Usuário inativo" })
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: "Credenciais inválidas" })
    }

    // Atualizar último login
    await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

    // Gerar token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "24h" },
    )

    // Remover senha do retorno
    delete user.password_hash

    res.json({
      message: "Login realizado com sucesso",
      token,
      user,
    })
  } catch (error) {
    next(error)
  }
})

// Register (apenas para admin)
router.post("/register", /*authenticateToken*/ validateRequest(schemas.register), async (req, res, next) => {
  try {
    // Verificar se é admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem criar usuários" })
    }

    const { name, email, password, role, permissions } = req.body

    // Verificar se email já existe
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email já está em uso" })
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10)

    // Criar usuário
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, permissions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, permissions, is_active, created_at
    `,
      [name, email, passwordHash, role, permissions],
    )

    const newUser = result.rows[0]

    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: newUser,
    })
  } catch (error) {
    next(error)
  }
})

// Verificar token
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  })
})

// Refresh token
router.post("/refresh", authenticateToken, (req, res) => {
  const token = jwt.sign(
    { userId: req.user.id, email: req.user.email, role: req.user.role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "24h" },
  )

  res.json({ token })
})

module.exports = router
