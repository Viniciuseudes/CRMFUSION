const express = require("express");
const pool = require("../config/database");
const { requireRole } = require("../middleware/auth");
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Assegure-se que estas variáveis estão no seu arquivo .env na Render
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

        // Define um caminho único para o arquivo para evitar conflitos
        const filePath = `public/${id}/${Date.now()}-${fileName}`;

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
        const { imagePath } = req.body; // Alterado de imageUrl para imagePath

        if (!imagePath) {
            return res.status(400).json({ error: 'O caminho da imagem é obrigatório.' });
        }
        
        // Monta a URL pública final usando o 'path' retornado pelo Supabase
        const { data } = supabase
            .storage
            .from('room-images') // Nome do seu bucket
            .getPublicUrl(imagePath);

        const publicUrl = data.publicUrl;

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