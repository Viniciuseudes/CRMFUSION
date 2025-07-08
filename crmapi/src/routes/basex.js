const express = require("express");
const pool = require("../config/database");
const { validateRequest, schemas } = require("../middleware/validation");

const router = express.Router();

// GET /api/basex - Listar leads da BaseX
router.get("/", async (req, res, next) => {
  try {
    let query = `
      SELECT b.*, u.name as created_by_name
      FROM basex_leads b
      JOIN users u ON b.created_by = u.id
    `;
    const params = [];

    // Se o usuário não for admin ou gerente, mostra apenas os que ele criou
    if (req.user.role === 'colaborador') {
      query += ' WHERE b.created_by = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/basex - Adicionar um novo lead à BaseX
router.post("/", validateRequest(schemas.createBaseXLead), async (req, res, next) => {
  try {
    const { name, specialty, whatsapp, instagram, is_accessible, needs_room, patient_demand, valid_council, general_info } = req.body;
    
    const result = await pool.query(
      `INSERT INTO basex_leads 
        (name, specialty, whatsapp, instagram, is_accessible, needs_room, patient_demand, valid_council, general_info, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, specialty, whatsapp, instagram, is_accessible, needs_room, patient_demand, valid_council, general_info, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});



module.exports = router;