// clinica/routes/dashboardRoute.js
import express from 'express';
import DashboardController from '../controllers/dashboardController.js';

const router = express.Router();
router.get('/dashboard/financial-summary', DashboardController.getFinancialSummary);
router.get('/dashboard/inventory-summary', DashboardController.getInventorySummary);
router.get('/dashboard/birthdays', DashboardController.getBirthdaySummary);
router.get('/dashboard/reports-summary', DashboardController.getReportsPageSummary);

export default router;