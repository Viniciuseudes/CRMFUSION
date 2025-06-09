const express = require("express")
const pool = require("../config/database")
const { validateRequest, schemas } = require("../middleware/validation")

const router = express.Router()

// Listar clientes - REMOVIDA A RESTRIÇÃO DE VISUALIZAÇÃO
router.get("/", async (req, res, next) => {
  try {
    const { status, specialty, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, u.name as assigned_to_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filtros opcionais
    if (status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
    }
    if (specialty) {
      paramCount++;
      query += ` AND c.specialty ILIKE $${paramCount}`;
      params.push(`%${specialty}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contagem total
    let countQuery = "SELECT COUNT(*) FROM clients c WHERE 1=1";
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND c.status = $${countParamCount}`;
      countParams.push(status);
    }
    if (specialty) {
      countParamCount++;
      countQuery += ` AND c.specialty ILIKE $${countParamCount}`;
      countParams.push(`%${specialty}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = Number.parseInt(countResult.rows[0].count);

    res.json({
      clients: result.rows,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});


// Buscar cliente por ID - REMOVIDA A RESTRIÇÃO DE VISUALIZAÇÃO
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT c.*, u.name as assigned_to_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});


// Criar cliente
router.post("/", validateRequest(schemas.createClient), async (req, res, next) => {
  try {
    const clientData = {
      ...req.body,
      assigned_to: req.user.id,
    }

    const result = await pool.query(
      `
      INSERT INTO clients (name, phone, email, last_purchase, doctor, specialty, status, total_spent, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        clientData.name,
        clientData.phone,
        clientData.email,
        clientData.last_purchase,
        clientData.doctor,
        clientData.specialty,
        clientData.status,
        clientData.total_spent,
        clientData.assigned_to,
      ],
    )

    const newClient = result.rows[0]

    // Registrar atividade
    await pool.query(
      `
      INSERT INTO activities (client_id, type, description, user_id)
      VALUES ($1, $2, $3, $4)
    `,
      [newClient.id, "note", `Cliente ${newClient.name} criado`, req.user.id],
    )

    res.status(201).json(newClient)
  } catch (error) {
    next(error)
  }
})

// Atualizar cliente
router.put("/:id", validateRequest(schemas.updateClient), async (req, res, next) => {
  try {
    const { id } = req.params

    // Permissão para editar ainda pode ser restrita, se desejado.
    // Por enquanto, qualquer usuário logado pode editar.
    const existingClient = await pool.query("SELECT * FROM clients WHERE id = $1", [id]);
    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" })
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
      UPDATE clients 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Deletar cliente
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const existingClient = await pool.query("SELECT * FROM clients WHERE id = $1", [id])
    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" })
    }
    await pool.query("DELETE FROM clients WHERE id = $1", [id])
    res.json({ message: "Cliente removido com sucesso" })
  } catch (error) {
    next(error)
  }
})

// Listar atividades do cliente
router.get("/:id/activities", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
  
      const clientCheck = await pool.query("SELECT id FROM clients WHERE id = $1", [id]);
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
  
      const result = await pool.query(
        `
        SELECT a.*, u.name as user_name
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.client_id = $1
        ORDER BY a.date DESC
        LIMIT $2 OFFSET $3
      `,
        [id, limit, offset]
      );
  
      const countResult = await pool.query("SELECT COUNT(*) FROM activities WHERE client_id = $1", [id]);
      const total = Number.parseInt(countResult.rows[0].count);
  
      res.json({
        activities: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  });
  
// NOVA ROTA PARA ADICIONAR COMPRA
router.post("/:id/purchases", validateRequest(schemas.addPurchase), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { value } = req.body;
  
      const result = await pool.query(
        `UPDATE clients
         SET 
           last_purchase = CURRENT_DATE,
           total_spent = total_spent + $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [value, id]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
  
      // Opcional: Registrar uma atividade para a nova compra
      await pool.query(
        `INSERT INTO activities (client_id, type, description, user_id)
         VALUES ($1, 'note', $2, $3)`,
        [id, `Nova compra registrada no valor de R$ ${Number(value).toFixed(2)}`, req.user.id]
      );
  
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
});

module.exports = router