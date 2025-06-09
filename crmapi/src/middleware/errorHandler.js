const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  // Erro de validação do Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: err.details.map((detail) => detail.message),
    })
  }

  // Erro do PostgreSQL
  if (err.code) {
    switch (err.code) {
      case "23505": // Unique violation
        return res.status(409).json({
          error: "Dados duplicados",
          message: "Este registro já existe",
        })
      case "23503": // Foreign key violation
        return res.status(400).json({
          error: "Referência inválida",
          message: "Registro referenciado não existe",
        })
      case "23502": // Not null violation
        return res.status(400).json({
          error: "Campo obrigatório",
          message: "Campos obrigatórios não podem estar vazios",
        })
      default:
        console.error("Database error:", err)
        return res.status(500).json({
          error: "Erro interno do servidor",
        })
    }
  }

  // Erro JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Token inválido",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expirado",
    })
  }

  // Erro padrão
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
  })
}

module.exports = { errorHandler }
