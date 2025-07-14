// routes/categoryRoute.js
import express from 'express';
import CategoryModel from '../models/categoryModel.js';

const router = express.Router();

router.get('/categorias', async (req, res) => {
    try {
        const categorias = await CategoryModel.listCategories();
        res.json(categorias); 
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        res.status(500).json({ error: 'Erro ao listar categorias' });
    }
});

router.post('/categorias', async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
        }

        const categoryId = await CategoryModel.createCategory(nome);
        res.json({ success: true, id: categoryId });
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

export default router;
