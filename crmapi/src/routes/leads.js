const express = require("express")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")
const { requirePermission } = require("../middleware/auth")

const router = express.Router()

// Listar leads
router.get("/", async (req, res, next) => {
  try {
    // Adicionado 'standby' aos parâmetros de query
    const { funnel, source, specialty, standby, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 0

    // Filtro para o status de stand-by
    if (standby === 'true') {
      query += ` AND l.is_standby = TRUE`
    } else {
      query += ` AND l.is_standby = FALSE`
    }

    // Filtros baseados em permissões
    if (req.user.role !== "admin") {
      query += ` AND (l.assigned_to = $${++paramCount} OR l.funnel::text = ANY($${++paramCount}))`
      params.push(req.user.id, req.user.permissions)
    }

    // Filtros opcionais
    if (funnel) {
      paramCount++
      query += ` AND l.funnel = $${paramCount}`
      params.push(funnel)
    }
    if (source) {
      paramCount++
      query += ` AND l.source = $${paramCount}`
      params.push(source)
    }
    if (specialty) {
      paramCount++
      query += ` AND l.specialty ILIKE $${paramCount}`
      params.push(`%${specialty}%`)
    }
    
    query += ` ORDER BY l.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Contagem total
    let countQuery = "SELECT COUNT(*) FROM leads l WHERE 1=1"
    const countParams = []
    let countParamCount = 0

    if (standby === 'true') {
        countQuery += ` AND l.is_standby = TRUE`
    } else {
        countQuery += ` AND l.is_standby = FALSE`
    }


    if (req.user.role !== "admin") {
      countQuery += ` AND (l.assigned_to = $${++countParamCount} OR l.funnel::text = ANY($${++countParamCount}))`
      countParams.push(req.user.id, req.user.permissions)
    }

    if (funnel) {
      countParamCount++
      countQuery += ` AND l.funnel = $${countParamCount}`
      countParams.push(funnel)
    }
    if (source) {
      countParamCount++
      countQuery += ` AND l.source = $${countParamCount}`
      countParams.push(source)
    }
    if (specialty) {
      countParamCount++
      countQuery += ` AND l.specialty ILIKE $${countParamCount}`
      countParams.push(`%${specialty}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      leads: result.rows,
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

// Buscar lead por ID (mantido sem alterações)
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    let query = `
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = $1
    `
    const params = [id]
    let paramCount = 1

    if (req.user.role !== "admin") {
      query += ` AND (l.assigned_to = $${++paramCount} OR l.funnel::text = ANY($${++paramCount}))`
      params.push(req.user.id, req.user.permissions)
    }

    const result = await pool.query(query, params)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead não encontrado ou sem permissão" })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Criar lead (mantido sem alterações)
router.post("/", validateRequest(schemas.createLead), async (req, res, next) => {
  try {
    const leadData = {
      ...req.body,
      assigned_to: req.user.id,
    }

    const result = await pool.query(
      `
      INSERT INTO leads (name, specialty, phone, email, funnel, stage, tags, value, notes, source, assigned_to,state)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
      [
        leadData.name,
        leadData.specialty,
        leadData.phone,
        leadData.email,
        leadData.funnel,
        leadData.stage,
        leadData.tags,
        leadData.value,
        leadData.notes,
        leadData.source,
        leadData.assigned_to,
        leadData.state,
      ]
    )

    const newLead = result.rows[0]

    await pool.query(
      `
      INSERT INTO activities (lead_id, type, description, user_id)
      VALUES ($1, $2, $3, $4)
    `,
      [newLead.id, "note", `Lead ${newLead.name} criado`, req.user.id]
    )

    res.status(201).json(newLead)
  } catch (error) {
    next(error)
  }
})

// Atualizar lead (mantido sem alterações)
router.put("/:id", validateRequest(schemas.updateLead), async (req, res, next) => {
  try {
    const { id } = req.params

    const existingLeadResult = await pool.query("SELECT * FROM leads WHERE id = $1", [id]);
    if (existingLeadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead não encontrado" });
    }
    const oldLead = existingLeadResult.rows[0];

    if (req.user.role !== "admin" && oldLead.assigned_to !== req.user.id && !req.user.permissions.includes(oldLead.funnel)) {
      return res.status(403).json({ error: "Permissão insuficiente" });
    }

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
      UPDATE leads 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    const updatedLead = result.rows[0]

    if (req.body.stage && req.body.stage !== oldLead.stage) {
      await pool.query(`INSERT INTO activities (lead_id, type, description, user_id) VALUES ($1, 'stage_change', $2, $3)`, [id, `Lead movido para ${req.body.stage}`, req.user.id])
    }
    if (req.body.funnel && req.body.funnel !== oldLead.funnel) {
      await pool.query(`INSERT INTO activities (lead_id, type, description, user_id) VALUES ($1, 'funnel_change', $2, $3)`, [id, `Lead movido para funil ${req.body.funnel}`, req.user.id])
    }

    res.json(updatedLead)
  } catch (error) {
    next(error)
  }
})

// === NOVA ROTA PARA ATUALIZAR STATUS STAND-BY ===
router.put("/:id/standby", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { standby } = req.body;

    if (typeof standby !== 'boolean') {
      return res.status(400).json({ error: "O campo 'standby' deve ser um valor booleano." });
    }

    const leadResult = await pool.query(
      `
      UPDATE leads
      SET is_standby = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
      [standby, id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead não encontrado." });
    }

    const activityDescription = standby 
        ? `Lead movido para Stand-by.` 
        : `Lead reativado do Stand-by.`;

    await pool.query(
        `INSERT INTO activities (lead_id, type, description, user_id) VALUES ($1, 'note', $2, $3)`,
        [id, activityDescription, req.user.id]
    );

    res.json(leadResult.rows[0]);
  } catch (error) {
    next(error);
  }
});


// Deletar lead (mantido sem alterações)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params

    const existingLeadResult = await pool.query("SELECT * FROM leads WHERE id = $1", [id]);
    if (existingLeadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead não encontrado" });
    }
    const lead = existingLeadResult.rows[0];
    
    if (req.user.role !== "admin" && lead.assigned_to !== req.user.id) {
        return res.status(403).json({ error: "Permissão insuficiente" });
    }

    await pool.query("DELETE FROM leads WHERE id = $1", [id])
    res.json({ message: "Lead removido com sucesso" })
  } catch (error) {
    next(error)
  }
})

// Converter lead em cliente (mantido sem alterações)
router.post("/:id/convert", validateRequest(schemas.convertLead), async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const { id } = req.params
    const { saleValue, targetFunnel, targetStage, conversionDate } = req.body;

    const leadResult = await client.query("SELECT * FROM leads WHERE id = $1", [id])
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead não encontrado" })
    }
    const lead = leadResult.rows[0]

    if (req.user.role !== "admin" && lead.assigned_to !== req.user.id) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(403).json({ error: "Permissão insuficiente para converter este lead" });
    }
    
    const clientResult = await client.query(
      `
      INSERT INTO clients (name, phone, email, entry_date, first_purchase_date, last_purchase, doctor, specialty, status, total_spent, assigned_to,state)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
      [
        lead.name,
        lead.phone,
        lead.email,
        conversionDate,
        conversionDate,
        conversionDate,
        lead.doctor || null,
        lead.specialty,
        "Ativo",
        saleValue,
        lead.assigned_to,
        lead.state,

      ]
    )
    const newClient = clientResult.rows[0]

    const updatedLeadResult = await client.query(
      `
      UPDATE leads
      SET 
        funnel = $1,
        stage = $2,
        is_converted_client = TRUE,
        client_id = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `,
      [
        targetFunnel,
        targetStage,
        newClient.id,
        id
      ]
    );

    const updatedLead = updatedLeadResult.rows[0];

    await client.query(`INSERT INTO activities (lead_id, client_id, type, description, user_id) VALUES ($1, $2, 'conversion', $3, $4)`, 
    [
      lead.id, 
      newClient.id, 
      `Lead ${lead.name} convertido em cliente com venda de R$ ${saleValue.toFixed(2)}. Funil: ${targetFunnel}, Estágio: ${targetStage}`,
      req.user.id
    ]);
    
    await client.query(`INSERT INTO activities (lead_id, type, description, user_id) VALUES ($1, 'funnel_change', $2, $3)`, 
    [lead.id, `Lead ${lead.name} movido para funil ${targetFunnel} (convertido)`, req.user.id]);
    
    await client.query(`INSERT INTO activities (lead_id, type, description, user_id) VALUES ($1, 'stage_change', $2, $3)`, 
    [lead.id, `Lead ${lead.name} movido para estágio ${targetStage} (convertido)`, req.user.id]);

    await client.query("COMMIT")

    res.json({ message: "Lead convertido e atualizado com sucesso", lead: updatedLead, client: newClient })
  } catch (error) {
    await client.query("ROLLBACK")
    next(error)
  } finally {
    client.release()
  }
})

module.exports = router