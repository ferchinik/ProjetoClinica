// clinica/controllers/dashboardController.js - VERSÃO CORRIGIDA getInventorySummary
import TransactionModel from '../models/transactionModel.js';
import ProductModel from '../models/productModel.js'; // <--- Verifique se está importado
import ClientModel from '../models/clientModel.js';   // <--- Verifique se está importado
import AgendamentoModel from '../models/agendamentoModel.js'; // <--- Verifique se está importado

/**
 * Retorna a data no formato YYYY-MM-DD.
 */
const getFormattedDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return null;
    return date.toISOString().split('T')[0];
};

// -------------------------------------------------------------------------

export default class DashboardController {

    /**
     * Busca dados resumidos para os cards financeiros do Dashboard principal.
     */
    static async getFinancialSummary(req, res) {
        console.log("[Controller] GET /dashboard/financial-summary");
        try {
            const today = new Date();
            const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Semana começa na Segunda
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const todayStr = getFormattedDate(today);
            const startOfWeekStr = getFormattedDate(startOfWeek);
            const startOfMonthStr = getFormattedDate(startOfMonth);

            const [todaySummary, weekSummary, monthSummary, chartData] = await Promise.all([
                TransactionModel.calculatePeriodSummary(todayStr, todayStr),
                TransactionModel.calculatePeriodSummary(startOfWeekStr, todayStr),
                TransactionModel.calculatePeriodSummary(startOfMonthStr, todayStr),
                TransactionModel.getMonthlyIncomeData(6)
            ]);

            res.status(200).json({
                success: true,
                summary: {
                    today: todaySummary.ingresos || 0,
                    week: weekSummary.ingresos || 0,
                    month: monthSummary.ingresos || 0
                },
                chartData: chartData
            });
        } catch (error) {
            console.error("Erro no Controller [getFinancialSummary]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar resumo financeiro.' });
        }
    }

    /**
     * Busca dados resumidos para os cards de inventário do Dashboard principal.
     * -- CORRIGIDO PARA USAR FUNÇÕES EXISTENTES DO MODEL --
     */
    static async getInventorySummary(req, res) {
        console.log("[Controller] GET /dashboard/inventory-summary");
        try {
            // ---> GARANTIA DA CORREÇÃO <---
            // Chama as funções que REALMENTE existem no ProductModel
            // getCriticalStockProducts busca itens com estoque <= threshold (definido no model, ex: 10)
            const lowStockProductsList = await ProductModel.getCriticalStockProducts(10, 5); // Limite baixo estoque = 10, retorna max 5
            // getStockStatusCounts busca as contagens {low, normal, optimal}
            const stockStatusCounts = await ProductModel.getStockStatusCounts();

            console.log("[Controller] getInventorySummary - Dados do Model:", { lowStockProductsList, stockStatusCounts });

            res.status(200).json({
                success: true,
                criticalList: lowStockProductsList, // Lista de produtos com estoque baixo/crítico
                statusCounts: stockStatusCounts    // Contagens para o gráfico doughnut
            });
            // ---> FIM DA GARANTIA DA CORREÇÃO <---

        } catch (error) {
            // Este log agora deve mostrar o erro real se ocorrer no Model ou aqui
            console.error("Erro no Controller [getInventorySummary]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar resumo de inventário.' });
        }
    }

    /**
     * Busca os dados de aniversariantes (hoje e próximos) para o dashboard.
     */
    static async getBirthdaySummary(req, res) {
         console.log("[Controller] GET /dashboard/birthdays");
        try {
            const [todayBirthdays, upcomingBirthdays] = await Promise.all([
                ClientModel.getBirthdaysToday(),
                ClientModel.getUpcomingBirthdays(30, 5) // Próximos 30 dias, limite 5
            ]);
            res.status(200).json({
                success: true,
                today: todayBirthdays,
                upcoming: upcomingBirthdays
            });
        } catch(error) {
             console.error("Erro no Controller [getBirthdaySummary]:", error);
             res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar aniversários.' });
        }
    }

    /**
     * Busca dados resumidos para os cards da página de relatórios com base no período.
     */
    static async getReportsPageSummary(req, res) {
        const { startDate, endDate } = req.query;
        console.log(`[Controller] Recebido GET /dashboard/reports-summary - Start: ${startDate}, End: ${endDate}`);

        if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ success: false, message: 'Datas de início e fim (YYYY-MM-DD) são obrigatórias.' });
        }
         if (new Date(startDate) > new Date(endDate)) {
             return res.status(400).json({ success: false, message: 'Data de início não pode ser posterior à data de fim.' });
        }

        try {
            const [revenueData, appointmentCount, newClientCount] = await Promise.all([
                TransactionModel.calculatePeriodSummary(startDate, endDate),
                AgendamentoModel.countAppointmentsByDateRange(startDate, endDate),
                ClientModel.countNewClientsByDateRange(startDate, endDate)
            ]);

            const totalRevenue = revenueData.ingresos || 0;
            const totalAppointments = appointmentCount || 0;
            const ticketMedio = totalAppointments > 0 ? (totalRevenue / totalAppointments) : 0;

            const summary = {
                faturamento: totalRevenue,
                citas: totalAppointments,
                novosClientes: newClientCount,
                ticketMedio: ticketMedio
            };

            console.log("[Controller] Resumo para página de relatórios calculado:", summary);
            res.status(200).json({ success: true, summary: summary });

        } catch (error) {
            console.error("Erro no Controller [getReportsPageSummary]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao calcular resumo para relatórios.' });
        }
    }

} // Fim da classe DashboardController