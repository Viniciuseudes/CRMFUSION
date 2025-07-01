const express = require("express");
const pool = require("../config/database");
const { validateRequest, schemas } = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Listar Contratos (Admin e Gerente)
router.get("/", requireRole(["admin", "gerente"]), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        co.*, 
        cl.name as client_name, 
        cl.email as client_email,
        u.name as created_by_name
      FROM contracts co
      JOIN clients cl ON co.client_id = cl.id
      JOIN users u ON co.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      query += ` AND co.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY co.end_date ASC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contagem total
    let countQuery = "SELECT COUNT(*) FROM contracts WHERE 1=1";
    const countParams = [];
    if (status) {
        countQuery += ` AND status = $1`;
        countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = Number.parseInt(countResult.rows[0].count, 10);

    res.json({
      contracts: result.rows,
      pagination: {
        page: Number.parseInt(page, 10),
        limit: Number.parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Criar Contrato (Admin e Gerente)
router.post("/", requireRole(["admin", "gerente"]), validateRequest(schemas.createContract), async (req, res, next) => {
  try {
    const { client_id, title, start_date, end_date, monthly_value } = req.body;
    const result = await pool.query(
      `INSERT INTO contracts (client_id, title, start_date, end_date, monthly_value, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [client_id, title, start_date, end_date, monthly_value, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Atualizar Status do Contrato (Admin e Gerente)
router.put("/:id/status", requireRole(["admin", "gerente"]), validateRequest(schemas.updateContractStatus), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            "UPDATE contracts SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Contrato não encontrado." });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});


module.exports = router;