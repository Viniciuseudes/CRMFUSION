const express = require("express")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")
const { requireRole } = require("../middleware/auth")

const router = express.Router()

// ANTES: A verificação de permissão era global para todas as rotas.
// AGORA: A verificação será feita em cada rota individualmente, permitindo mais flexibilidade.

// Listar metas - Lógica de permissão refinada
router.get("/", async (req, res, next) => {
  try {
    const { type, period, is_active, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT g.*, u.name as assigned_to_name
      FROM goals g
      LEFT JOIN users u ON g.assigned_to = u.id
    `
    const params = []
    let paramCount = 0
    let whereClauses = []

    // Colaboradores veem apenas suas metas e as metas gerais (sem ninguém atribuído)
    if (req.user.role === 'colaborador') {
      whereClauses.push(`(g.assigned_to = $${++paramCount} OR g.assigned_to IS NULL)`)
      params.push(req.user.id)
    }

    // Filtros opcionais
    if (type) {
      whereClauses.push(`g.type = $${++paramCount}`)
      params.push(type)
    }
    if (period) {
      whereClauses.push(`g.period = $${++paramCount}`)
      params.push(period)
    }
    if (is_active !== undefined) {
      whereClauses.push(`g.is_active = $${++paramCount}`)
      params.push(is_active === "true")
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(limit, offset)

    const result = await pool.query(query, params)
    
    // A contagem total também precisa respeitar os filtros e permissões
    let countQuery = "SELECT COUNT(*) FROM goals g"
    if (whereClauses.length > 0) {
        countQuery += ` WHERE ${whereClauses.join(" AND ")}`
    }
    // Remove os parâmetros de paginação para a contagem
    const countParams = params.slice(0, paramCount - 2);

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      goals: result.rows,
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

// Buscar meta por ID - Aberto para todos, pois a lista já é filtrada
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query(`
      SELECT g.*, u.name as assigned_to_name
      FROM goals g
      LEFT JOIN users u ON g.assigned_to = u.id
      WHERE g.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meta não encontrada" })
    }
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Criar meta - Apenas Admin e Gerente
router.post("/", requireRole(["admin", "gerente"]), validateRequest(schemas.createGoal), async (req, res, next) => {
  try {
    const goalData = {
      ...req.body,
      // Se assigned_to não for enviado, a meta é do próprio usuário que a criou
      assigned_to: req.body.assigned_to === null ? null : (req.body.assigned_to || req.user.id),
    }

    const result = await pool.query(
      `
      INSERT INTO goals (title, description, type, target, period, funnel, source, assigned_to, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        goalData.title,
        goalData.description,
        goalData.type,
        goalData.target,
        goalData.period,
        goalData.funnel,
        goalData.source,
        goalData.assigned_to,
        goalData.start_date,
        goalData.end_date,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Atualizar meta - Apenas Admin e Gerente
router.put("/:id", requireRole(["admin", "gerente"]), validateRequest(schemas.updateGoal), async (req, res, next) => {
  try {
    const { id } = req.params
    const existingGoal = await pool.query("SELECT * FROM goals WHERE id = $1", [id])
    if (existingGoal.rows.length === 0) {
      return res.status(404).json({ error: "Meta não encontrada" })
    }

    const updates = [], values = []
    let paramCount = 0
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${++paramCount}`)
        values.push(req.body[key])
      }
    })

    if (updates.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" })

    values.push(id)
    const query = `UPDATE goals SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${++paramCount} RETURNING *`
    const result = await pool.query(query, values)
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Deletar meta - Apenas Admin e Gerente
router.delete("/:id", requireRole(["admin", "gerente"]), async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query("DELETE FROM goals WHERE id = $1 RETURNING *", [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Meta não encontrada" })
    }
    res.json({ message: "Meta removida com sucesso" })
  } catch (error) {
    next(error)
  }
})

// Obter progresso das metas - Lógica de permissão refinada
router.get("/:id/progress", async (req, res, next) => {
  try {
    const { id } = req.params
    const goalResult = await pool.query("SELECT * FROM goals WHERE id = $1", [id])
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: "Meta não encontrada" })
    }
    const goal = goalResult.rows[0]

    // Permite acesso se for admin/gerente, se a meta for geral ou se for atribuída ao próprio usuário
    if (req.user.role === 'colaborador' && goal.assigned_to !== null && goal.assigned_to !== req.user.id) {
        return res.status(403).json({ error: "Permissão insuficiente para ver o progresso desta meta." });
    }

    let current = 0
    // Lógica de cálculo de progresso permanece a mesma...
    switch (goal.type) {
      case "leads":
        const leadsResult = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE created_at BETWEEN $1 AND $2`, [goal.start_date, goal.end_date]);
        current = Number.parseInt(leadsResult.rows[0].count);
        break;
      case "conversions":
        const conversionsResult = await pool.query(`SELECT COUNT(*) as count FROM activities WHERE type = 'conversion' AND date BETWEEN $1 AND $2`, [goal.start_date, goal.end_date]);
        current = Number.parseInt(conversionsResult.rows[0].count);
        break;
      case "revenue":
        const revenueResult = await pool.query(`SELECT COALESCE(SUM(total_spent), 0) as total FROM clients WHERE created_at BETWEEN $1 AND $2`, [goal.start_date, goal.end_date]);
        current = Number.parseFloat(revenueResult.rows[0].total);
        break;
      case "pipeline_time":
         const pipelineResult = await pool.query(`SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days FROM leads WHERE updated_at BETWEEN $1 AND $2`, [goal.start_date, goal.end_date]);
        current = Number.parseFloat(pipelineResult.rows[0].avg_days) || 0;
        break;
    }

    const progress = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0
    res.json({ goal, current, target: goal.target, progress: Math.round(progress * 100) / 100, is_completed: progress >= 100 })
  } catch (error) {
    next(error)
  }
})

module.exports = router