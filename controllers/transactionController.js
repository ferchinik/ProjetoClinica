// clinica/controllers/transactionController.js
import TransactionModel from '../models/transactionModel.js';

export default class TransactionController {

    // Método create (sem alterações)
    static async create(req, res) {
        console.log("Controller: Recebido POST /api/transacoes", req.body);
        try {
            const transactionData = req.body;
            const { data, descricao, categoria, tipo, valor } = transactionData;
            if (!data || !descricao || !categoria || !tipo || valor === undefined || valor === null) {
                return res.status(400).json({ success: false, message: 'Controller Error: Todos os campos são obrigatórios.' });
            }
            if (tipo !== 'Ingreso' && tipo !== 'Gasto') {
                return res.status(400).json({ success: false, message: 'Controller Error: Tipo inválido.' });
            }
            if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
                 return res.status(400).json({ success: false, message: 'Controller Error: Valor inválido.' });
            }
            const newTransactionId = await TransactionModel.createTransaction(transactionData);
            res.status(201).json({
                success: true,
                message: 'Registro financeiro criado com sucesso!',
                transactionId: newTransactionId
            });
        } catch (error) {
            console.error("Erro no Controller [create transaction]:", error);
            const statusCode = error.message.includes('obrigatórios') || error.message.includes('inválido') ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno ao criar registro financeiro.' });
        }
    }

    // Método list (sem alterações na lógica principal)
    static async list(req, res) {
        console.log("[DEBUG] Controller: Recebido GET /api/transacoes");
        console.log("[DEBUG] Controller: Query Params Recebidos:", req.query);

        try {
            const typeFilter = req.query.tipo || null;
            const periodFilter = req.query.mes || 'current_month';
            const categoryFilter = req.query.categoria || null;

            console.log(`[DEBUG] Controller: Filtros processados - tipo=${typeFilter}, mes=${periodFilter}, categoria=${categoryFilter}`);

            const transactions = await TransactionModel.listTransactions(
                typeFilter,
                periodFilter,
                categoryFilter
            );

            console.log(`[DEBUG] Controller: Model retornou ${transactions.length} transações.`);

            res.status(200).json({ success: true, transactions: transactions });
        } catch (error) {
             console.error("[DEBUG] Erro no Controller [list transactions]:", error);
             res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar transações.' });
        }
    }

    // Método getSummary (sem alterações)
    static async getSummary(req, res) {
        const period = req.query.period || 'current_month';
        const category = req.query.category || null;
        console.log(`Controller: Recebido GET /api/transacoes/summary - Period: ${period}, Category: ${category}`);
        try {
            const summaryData = await TransactionModel.calculateSummary(period, category);
            res.status(200).json({ success: true, summary: summaryData });
        } catch (error) {
            console.error("Erro no Controller [getSummary]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao calcular resumo financeiro.' });
        }
    }

    // Método delete (sem alterações)
    static async delete(req, res) {
        const transactionId = req.params.id;
        console.log(`Controller: Recebido DELETE /api/transacoes/${transactionId}`);
        try {
            const id = parseInt(transactionId);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ success: false, message: 'ID da transação inválido ou ausente.' });
            }
            const result = await TransactionModel.deleteTransaction(id);
            if (result.affectedRows > 0) {
               res.status(200).json({ success: true, message: 'Registro financeiro eliminado com sucesso!' });
            } else {
                res.status(404).json({ success: false, message: 'Registro financeiro não encontrado.' });
            }
        } catch (error) {
            console.error(`Erro no Controller [delete transaction ${transactionId}]:`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao eliminar registro financeiro.' });
        }
    }

    // Método getById (sem alterações)
    static async getById(req, res) {
        const transactionId = req.params.id;
        console.log(`Controller: Recebido GET /api/transacoes/${transactionId}`);
        try {
            const id = parseInt(transactionId);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ success: false, message: 'ID da transação inválido.' });
            }
            const transaction = await TransactionModel.getTransactionById(id);
            if (transaction) {
                res.status(200).json({ success: true, transaction });
            } else {
                res.status(404).json({ success: false, message: 'Transação não encontrada.' });
            }
        } catch (error) {
             console.error(`Erro no Controller [getById ${transactionId}]:`, error);
             res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar transação.' });
        }
    }

    // Método update (sem alterações)
    static async update(req, res) {
        const transactionId = req.params.id;
        const transactionData = req.body;
        console.log(`Controller: Recebido PUT /api/transacoes/${transactionId}`, transactionData);
        try {
             const id = parseInt(transactionId);
             if (isNaN(id) || id <= 0) {
                return res.status(400).json({ success: false, message: 'ID da transação inválido.' });
             }
             const { data, descricao, categoria, tipo, valor } = transactionData;
             if (!data || !descricao || !categoria || !tipo || valor === undefined || valor === null) {
                 return res.status(400).json({ success: false, message: 'Controller Error: Todos os campos são obrigatórios para atualizar.' });
             }
             if (tipo !== 'Ingreso' && tipo !== 'Gasto') {
                 return res.status(400).json({ success: false, message: 'Controller Error: Tipo inválido.' });
             }
             const parsedValor = parseFloat(valor);
             if (isNaN(parsedValor) || parsedValor <= 0) {
                  return res.status(400).json({ success: false, message: 'Controller Error: Valor inválido.' });
             }
             delete transactionData.id; // Remove id se veio no corpo por engano
            const result = await TransactionModel.updateTransaction(id, transactionData);
             if (result.affectedRows > 0) {
                res.status(200).json({ success: true, message: 'Registro financeiro atualizado com sucesso!' });
             } else {
                 res.status(404).json({ success: false, message: 'Registro financeiro não encontrado para atualizar.' });
             }
        } catch (error) {
            console.error(`Erro no Controller [update transaction ${transactionId}]:`, error);
            const statusCode = error.message.includes('inválido') || error.message.includes('obrigatórios') ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno ao atualizar registro financeiro.' });
        }
    }

    /**
     * Lista as categorias distintas de transações.
     */
    static async listCategories(req, res) {
        console.log("[Controller] Recebido GET /api/transacoes/categories");
        try {
            const categories = await TransactionModel.getDistinctCategories();
            res.status(200).json({ success: true, categories: categories });
        } catch (error) {
            console.error("Erro no Controller [listCategories]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar categorias de transações.' });
        }
    }

    // --- NOVO MÉTODO PARA CONTROLAR O RELATÓRIO ---
    /**
     * Busca dados de faturamento diário para um relatório.
     * Espera startDate e endDate como query parameters.
     */
    static async getDailyRevenueReport(req, res) {
        // Extrai as datas da query string da URL (?startDate=...&endDate=...)
        const { startDate, endDate } = req.query;
        console.log(`[Controller] Recebido GET /api/transacoes/reports/daily-revenue - Start: ${startDate}, End: ${endDate}`);

        // Validação básica das datas
        if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ success: false, message: 'Datas de início e fim (formato YYYY-MM-DD) são obrigatórias.' });
        }
        // Validação adicional (data de início não pode ser maior que a data fim)
        if (new Date(startDate) > new Date(endDate)) {
             return res.status(400).json({ success: false, message: 'Data de início não pode ser posterior à data de fim.' });
        }

        try {
            // Chama o novo método do Model
            const dailyRevenueData = await TransactionModel.getDailyRevenue(startDate, endDate);

            // Retorna os dados formatados como JSON
            res.status(200).json({
                success: true,
                reportParams: { startDate, endDate }, // Informa os parâmetros usados
                dailyRevenue: dailyRevenueData      // Array de {dia, faturamento_total}
            });
        } catch (error) {
            console.error("Erro no Controller [getDailyRevenueReport]:", error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao gerar relatório de faturamento diário.' });
        }
    }
    // --- FIM DO NOVO MÉTODO ---
}