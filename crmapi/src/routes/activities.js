const express = require("express")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")

const router = express.Router()

// Listar atividades
router.get("/", async (req, res, next) => {
  try {
    const { type, lead_id, client_id, user_id, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT a.*, u.name as user_name, l.name as lead_name, c.name as client_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN leads l ON a.lead_id = l.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 0

    // Filtros baseados em permissões
    if (req.user.role !== "admin") {
      paramCount++
      query += ` AND a.user_id = $${paramCount}`
      params.push(req.user.id)
    }

    // Filtros opcionais
    if (type) {
      paramCount++
      query += ` AND a.type = $${paramCount}`
      params.push(type)
    }

    if (lead_id) {
      paramCount++
      query += ` AND a.lead_id = $${paramCount}`
      params.push(lead_id)
    }

    if (client_id) {
      paramCount++
      query += ` AND a.client_id = $${paramCount}`
      params.push(client_id)
    }

    if (user_id && req.user.role === "admin") {
      paramCount++
      query += ` AND a.user_id = $${paramCount}`
      params.push(user_id)
    }

    query += ` ORDER BY a.date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Contar total
    let countQuery = "SELECT COUNT(*) FROM activities a WHERE 1=1"
    const countParams = []
    let countParamCount = 0

    if (req.user.role !== "admin") {
      countParamCount++
      countQuery += ` AND a.user_id = $${countParamCount}`
      countParams.push(req.user.id)
    }

    if (type) {
      countParamCount++
      countQuery += ` AND a.type = $${countParamCount}`
      countParams.push(type)
    }

    if (lead_id) {
      countParamCount++
      countQuery += ` AND a.lead_id = $${countParamCount}`
      countParams.push(lead_id)
    }

    if (client_id) {
      countParamCount++
      countQuery += ` AND a.client_id = $${countParamCount}`
      countParams.push(client_id)
    }

    if (user_id && req.user.role === "admin") {
      countParamCount++
      countQuery += ` AND a.user_id = $${countParamCount}`
      countParams.push(user_id)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      activities: result.rows,
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

// Buscar atividade por ID
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params

    let query = `
      SELECT a.*, u.name as user_name, l.name as lead_name, c.name as client_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN leads l ON a.lead_id = l.id
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.id = $1
    `
    const params = [id]

    // Verificar permissões
    if (req.user.role !== "admin") {
      query += ` AND a.user_id = $2`
      params.push(req.user.id)
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Atividade não encontrada" })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Criar atividade
router.post("/", validateRequest(schemas.createActivity), async (req, res, next) => {
  try {
    const activityData = {
      ...req.body,
      user_id: req.user.id,
    }

    // Verificar se lead_id ou client_id existe e se o usuário tem permissão
    if (activityData.lead_id) {
      const leadCheck = await pool.query(
        `
        SELECT id FROM leads WHERE id = $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
        req.user.role !== "admin" ? [activityData.lead_id, req.user.id] : [activityData.lead_id],
      )

      if (leadCheck.rows.length === 0) {
        return res.status(404).json({ error: "Lead não encontrado ou sem permissão" })
      }
    }

    if (activityData.client_id) {
      const clientCheck = await pool.query(
        `
        SELECT id FROM clients WHERE id = $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
        req.user.role !== "admin" ? [activityData.client_id, req.user.id] : [activityData.client_id],
      )

      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: "Cliente não encontrado ou sem permissão" })
      }
    }

    const result = await pool.query(
      `
      INSERT INTO activities (lead_id, client_id, type, description, date, user_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        activityData.lead_id,
        activityData.client_id,
        activityData.type,
        activityData.description,
        activityData.date,
        activityData.user_id,
        JSON.stringify(activityData.metadata),
      ],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Deletar atividade
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params

    // Verificar se a atividade existe e se o usuário tem permissão
    const existingActivity = await pool.query(
      `
      SELECT * FROM activities WHERE id = $1 ${req.user.role !== "admin" ? "AND user_id = $2" : ""}
    `,
      req.user.role !== "admin" ? [id, req.user.id] : [id],
    )

    if (existingActivity.rows.length === 0) {
      return res.status(404).json({ error: "Atividade não encontrada" })
    }

    await pool.query("DELETE FROM activities WHERE id = $1", [id])

    res.json({ message: "Atividade removida com sucesso" })
  } catch (error) {
    next(error)
  }
})

module.exports = router
