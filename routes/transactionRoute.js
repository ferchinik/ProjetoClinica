// clinica/routes/transactionRoute.js
import express from 'express';
import TransactionController from '../controllers/transactionController.js';

const router = express.Router();

router.post('/transacoes', TransactionController.create);
router.get('/transacoes', TransactionController.list);
router.get('/transacoes/summary', TransactionController.getSummary);
router.get('/transacoes/reports/daily-revenue', TransactionController.getDailyRevenueReport);
router.get('/transacoes/categories', TransactionController.listCategories);
router.get('/transacoes/:id', TransactionController.getById);
router.put('/transacoes/:id', TransactionController.update);
router.delete('/transacoes/:id', TransactionController.delete);

export default router;