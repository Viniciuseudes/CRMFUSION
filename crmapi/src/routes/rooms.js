const express = require("express");
const pool = require("../config/database");
const { requireRole } = require("../middleware/auth");
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Inicialize o cliente do Supabase com as variáveis de ambiente
// Certifique-se de que estas variáveis estão no seu arquivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota para criar uma URL de upload assinada
router.post('/:id/upload-url', requireRole(['admin', 'gerente']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'Nome e tipo do arquivo são obrigatórios.' });
        }

        const filePath = `public/${id}/${fileName}`;

        const { data, error } = await supabase
            .storage
            .from('room-images') // Nome do seu bucket
            .createSignedUploadUrl(filePath);

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao criar URL de upload:', error);
        next(error);
    }
});

// Rota para atualizar a URL da imagem da sala no banco de dados
router.put('/:id/image', requireRole(['admin', 'gerente']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: 'URL da imagem é obrigatória.' });
        }

        // Construir a URL pública final
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/room-images/${imageUrl}`;

        const result = await pool.query(
            'UPDATE rooms SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [publicUrl, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala não encontrada.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar URL da imagem:', error);
        next(error);
    }
});


module.exports = router;