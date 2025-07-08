const express = require("express");
const pool = require("../config/database");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/clinics - Listar todas as clínicas
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM clinics ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/clinics/:id - Obter detalhes de uma clínica
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const clinicResult = await pool.query("SELECT * FROM clinics WHERE id = $1", [id]);

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({ error: "Clínica não encontrada" });
    }

    const roomsResult = await pool.query("SELECT * FROM rooms WHERE clinic_id = $1 ORDER BY name", [id]);
    const clinic = clinicResult.rows[0];
    clinic.rooms = roomsResult.rows;

    res.json(clinic);
  } catch (error) {
    next(error);
  }
});

// POST /api/clinics - Criar uma nova clínica (Apenas Admin e Gerente)
router.post("/", requireRole(['admin', 'gerente']), async (req, res, next) => {
  try {
    const { name, address, numero, ponto_referencia, city, state, zip_code, phone, host_name } = req.body;
    
    const result = await pool.query(
      `INSERT INTO clinics (name, address, numero, ponto_referencia, city, state, zip_code, phone, host_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, address, numero, ponto_referencia, city, state, zip_code, phone, host_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});


// POST /api/clinics/:clinicId/rooms
router.post("/:clinicId/rooms", requireRole(["admin", "gerente"]), async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { 
      name, description, 
      price_per_hour, negotiation_margin_hour,
      price_per_shift, negotiation_margin_shift,
      price_per_day, negotiation_margin_day,
      price_fixed, negotiation_margin_fixed
    } = req.body;

    const result = await pool.query(
      `INSERT INTO rooms (
        clinic_id, name, description, 
        price_per_hour, negotiation_margin_hour,
        price_per_shift, negotiation_margin_shift,
        price_per_day, negotiation_margin_day,
        price_fixed, negotiation_margin_fixed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        clinicId, name, description,
        price_per_hour, negotiation_margin_hour,
        price_per_shift, negotiation_margin_shift,
        price_per_day, negotiation_margin_day,
        price_fixed, negotiation_margin_fixed
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;