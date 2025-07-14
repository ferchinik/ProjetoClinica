// clinica/routes/clientRoute.js (Revisado e Completo)
import express from 'express';
import ClientController from '../controllers/clientController.js';
import ClientModel from '../models/clientModel.js'; // Import necessário para chamar ClientModel.deleteClient

const router = express.Router();

router.get('/clientes', ClientController.list);
router.post('/clientes', ClientController.uploadMiddleware(), ClientController.create);
router.get('/clientes/:id', ClientController.getById);
router.put('/clientes/:id', ClientController.uploadMiddleware(), ClientController.update);
router.delete('/clientes/:id', async (req, res) => {
    const clientId = req.params.id;
    console.log(`[Route DELETE /api/clientes/${clientId}] Rota acionada.`);
    try {
        const idNum = parseInt(clientId);
        if (isNaN(idNum) || idNum <= 0) {
            return res.status(400).json({ success: false, message: 'ID de cliente inválido.' });
        }
        const deleted = await ClientModel.deleteClient(idNum);

        if (deleted) {
            console.log(`[Route DELETE /api/clientes/${clientId}] Cliente excluído com sucesso pelo Model.`);
            res.status(200).json({ success: true, message: 'Cliente excluído com sucesso!' });
        } else {
            console.log(`[Route DELETE /api/clientes/${clientId}] Cliente não encontrado pelo Model (ID: ${idNum}).`);
            res.status(404).json({ success: false, message: 'Cliente não encontrado para excluir.' });
        }
    } catch (error) {
        console.error(`[Route DELETE /api/clientes/${clientId}] Erro durante a exclusão:`, error);
        res.status(500).json({ success: false, message: error.message || 'Erro interno do servidor ao excluir cliente.' });
    }
});

export default router;