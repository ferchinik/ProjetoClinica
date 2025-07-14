// clinica/routes/agendamentoRoute.js
import express from 'express';
import AgendamentoController from '../controllers/agendamentoController.js';

const router = express.Router();

router.post('/agendamentos', AgendamentoController.create);
router.get('/agendamentos', AgendamentoController.list);
router.get('/agendamentos/month', AgendamentoController.listByMonth);
router.get('/agendamentos/by-range', AgendamentoController.listByDateRange);
router.get('/agendamentos/reports/procedure-counts', AgendamentoController.getProcedureCountsReport);
router.get('/agendamentos/:id', AgendamentoController.getById);
router.put('/agendamentos/:id', AgendamentoController.update);
router.delete('/agendamentos/:id', AgendamentoController.delete);

export default router;