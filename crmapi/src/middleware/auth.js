const jwt = require("jsonwebtoken")
const pool = require("../config/database")

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Token de acesso requerido" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")

    // Verificar se o usuário ainda existe e está ativo
    const result = await pool.query("SELECT id, name, email, role, permissions, is_active FROM users WHERE id = $1", [
      decoded.userId,
    ])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" })
    }

    const user = result.rows[0]
    if (!user.is_active) {
      return res.status(401).json({ error: "Usuário inativo" })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Erro na autenticação:", error)
    return res.status(403).json({ error: "Token inválido" })
  }
}

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permissão insuficiente" })
    }

    next()
  }
}

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" })
    }

    if (req.user.role === "admin") {
      return next() // Admin tem todas as permissões
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: "Permissão insuficiente" })
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
}
