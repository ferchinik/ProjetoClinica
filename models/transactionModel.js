import { db } from '../config/db.js';

export default class TransactionModel {
    static createTransaction(transactionData) {
        return new Promise((resolve, reject) => {
            const { data, descricao, categoria, tipo, valor, cliente_id } = transactionData;
            if (!data || !descricao || !categoria || !tipo || valor == null) {
                return reject(new Error('Todos os campos são obrigatórios para a transação.'));
            }
            if (tipo !== 'Ingreso' && tipo !== 'Gasto') {
                return reject(new Error('Tipo de transação inválido. Use "Ingreso" ou "Gasto".'));
            }
            const parsedValor = parseFloat(valor);
            if (isNaN(parsedValor) || parsedValor <= 0) {
                return reject(new Error('O valor da transação deve ser um número positivo.'));
            }

            // Preparar a query com ou sem cliente_id dependendo se foi fornecido
            let query, params;
            if (cliente_id) {
                query = `INSERT INTO transacoes (data, descricao, categoria, tipo, valor, cliente_id) VALUES (?, ?, ?, ?, ?, ?)`;
                params = [data, descricao, categoria, tipo, parsedValor, cliente_id];
            } else {
                query = `INSERT INTO transacoes (data, descricao, categoria, tipo, valor) VALUES (?, ?, ?, ?, ?)`;
                params = [data, descricao, categoria, tipo, parsedValor];
            }

            db.query(query, params, (err, result) => {
                if (err) {
                    console.error("Erro DB [createTransaction]:", err);
                    return reject(new Error('Erro interno ao salvar transação no banco de dados.'));
                }
                if (result && result.insertId) {
                    console.log(`Model Success: Transação criada com ID: ${result.insertId}${cliente_id ? `, associada ao cliente ID: ${cliente_id}` : ''}`);
                    resolve(result.insertId);
                } else {
                    console.error("Model Error: Falha ao obter insertId após INSERT em transacoes.");
                    reject(new Error('Não foi possível criar a transação.'));
                }
            });
        });
    }

    static listTransactions(typeFilter = null, periodFilter = null, categoryFilter = null) {
        return new Promise((resolve, reject) => {
            let query      = `SELECT id, data, descricao, categoria, tipo, valor, cliente_id FROM transacoes`;
            const params   = [];
            const conds    = [];

            if (typeFilter === 'Ingreso' || typeFilter === 'Gasto') {
                conds.push('tipo = ?');
                params.push(typeFilter);
            }
            if (categoryFilter) {
                conds.push('categoria = ?');
                params.push(categoryFilter);
            }
            if (periodFilter === 'current_month') {
                conds.push('MONTH(data) = MONTH(CURRENT_DATE()) AND YEAR(data) = YEAR(CURRENT_DATE())');
            } else if (periodFilter === 'last_month') {
                conds.push(
                  'YEAR(data) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH) ' +
                  'AND MONTH(data) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH)'
                );
            }

            if (conds.length) {
                query += ' WHERE ' + conds.join(' AND ');
            }
            query += ' ORDER BY data DESC, id DESC LIMIT 50';

            console.log(`[Model] Executando listTransactions: ${query}`, params);
            db.query(query, params, (err, results) => {
                if (err) {
                    console.error("Erro DB [listTransactions]:", err);
                    return reject(new Error('Erro ao buscar transações filtradas.'));
                }
                console.log(`[Model] listTransactions retornou ${results.length} linhas.`);
                resolve(results);
            });
        });
    }

    static calculateSummary(period, categoryFilter = null) {
        return new Promise((resolve, reject) => {
            const conds  = [];
            const params = [];
            let where    = '';

            if (period === 'current_month') {
                conds.push('MONTH(data) = MONTH(CURRENT_DATE()) AND YEAR(data) = YEAR(CURRENT_DATE())');
            } else if (period === 'last_month') {
                conds.push(
                  'YEAR(data) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH) ' +
                  'AND MONTH(data) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH)'
                );
            }
            if (categoryFilter) {
                conds.push('categoria = ?');
                params.push(categoryFilter);
            }
            if (conds.length) {
                where = 'WHERE ' + conds.join(' AND ');
            }

            const query = `
                SELECT
                    SUM(CASE WHEN tipo = 'Ingreso' THEN valor ELSE 0 END) as ingresos,
                    SUM(CASE WHEN tipo = 'Gasto'   THEN valor ELSE 0 END) as gastos
                FROM transacoes
                ${where}
            `;

            console.log(`[Model] Executando calculateSummary: ${query}`, params);
            db.query(query, params, (err, results) => {
                if (err) {
                    console.error("Erro DB [calculateSummary]:", err);
                    return reject(new Error('Erro ao calcular resumo financeiro.'));
                }
                const row = results[0] || { ingresos: 0, gastos: 0 };
                const summary = {
                    ingresos: parseFloat(row.ingresos) || 0,
                    gastos:   parseFloat(row.gastos)   || 0
                };
                summary.balance = summary.ingresos - summary.gastos;
                console.log("[Model] calculateSummary retornou:", summary);
                resolve(summary);
            });
        });
    }

    static getDistinctCategories() {
        return new Promise(async (resolve, reject) => {
            const query = `
                SELECT DISTINCT categoria
                FROM transacoes
                WHERE categoria IS NOT NULL AND categoria <> ''
                ORDER BY categoria ASC
            `;
            try {
                const [results] = await db.promise().query(query);
                const categories = results.map(r => r.categoria);
                console.log(`[Model] Categorias distintas: ${categories.length}`);
                resolve(categories);
            } catch (err) {
                console.error("Erro DB [getDistinctCategories]:", err);
                reject(new Error('Erro ao buscar categorias distintas.'));
            }
        });
    }
    static async calculatePeriodSummary(startDate, endDate) {
        const query = `
            SELECT
                SUM(CASE WHEN tipo = 'Ingreso' THEN valor ELSE 0 END) as ingresos,
                SUM(CASE WHEN tipo = 'Gasto'   THEN valor ELSE 0 END) as gastos
            FROM transacoes
            WHERE data BETWEEN ? AND ?
        `;
        try {
            const [results] = await db.promise().query(query, [startDate, endDate]);
            const row = results[0] || { ingresos: 0, gastos: 0 };
            return {
                ingresos: parseFloat(row.ingresos) || 0,
                gastos:   parseFloat(row.gastos)   || 0
            };
        } catch (err) {
            console.error(`Erro DB [calculatePeriodSummary]:`, err);
            return { ingresos: 0, gastos: 0 };
        }
    }
    static async getMonthlyIncomeData(monthsToFetch = 6) { 
        const numMonths = Number.isInteger(monthsToFetch) && monthsToFetch > 0 ? monthsToFetch : 6;
        console.log(`[Model] getMonthlyIncomeData: Buscando dados dos últimos ${numMonths} meses.`);

        const query = `
            SELECT 
                YEAR(data) as year,
                MONTH(data) as month,
                SUM(CASE WHEN tipo = 'Ingreso' THEN valor ELSE 0 END) as ingresos
            FROM transacoes
            WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
            GROUP BY YEAR(data), MONTH(data)
            ORDER BY year ASC, month ASC
        `;
        try {
            const [results] = await db.promise().query(query, [numMonths]);

            const allMonths = [];
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth() - (numMonths - 1), 1);

            for (let i = 0; i < numMonths; i++) {
                const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                const year = d.getFullYear();
                const month = d.getMonth() + 1;
                const existingData = results.find(r => r.year === year && r.month === month);
            
                allMonths.push({
                    year: year,
                    month: month,
                    ingresos: existingData ? parseFloat(existingData.ingresos) : 0
                });
            }
            
            console.log(`[Model] getMonthlyIncomeData: Retornando ${allMonths.length} entradas de meses.`);
            return allMonths;
        } catch (err) {
            console.error("Erro DB [getMonthlyIncomeData]:", err);
            return [];
        }
    }
    static async getDailyRevenue(startDate, endDate) {
        const query = `
            SELECT DATE(data) as dia, SUM(valor) as faturamento_total
            FROM transacoes
            WHERE tipo = 'Ingreso' AND data BETWEEN ? AND ?
            GROUP BY DATE(data)
            ORDER BY dia ASC
        `;
        try {
            const [results] = await db.promise().query(query, [startDate, endDate]);
            return results.map(r => ({
                dia:               r.dia,
                faturamento_total: parseFloat(r.faturamento_total) || 0
            }));
        } catch (err) {
            console.error(`Erro DB [getDailyRevenue]:`, err);
            throw new Error('Erro ao buscar faturamento diário.');
        }
    }

    static deleteTransaction(id) {
        return new Promise(async (resolve, reject) => {
            const query = `DELETE FROM transacoes WHERE id = ?`;
            try {
                const [result] = await db.promise().query(query, [id]);
                console.log(`[Model] deleteTransaction ID ${id}:`, result);
                resolve(result);
            } catch (err) {
                console.error(`Erro DB [deleteTransaction]:`, err);
                reject(new Error('Erro interno ao eliminar transação.'));
            }
        });
    }
    static getTransactionById(id) {
        return new Promise(async (resolve, reject) => {
            const query = `
                SELECT id, data, descricao, categoria, tipo, valor, cliente_id
                FROM transacoes
                WHERE id = ?
            `;
            try {
                const [results] = await db.promise().query(query, [id]);
                resolve(results[0] || null);
            } catch (err) {
                console.error(`Erro DB [getTransactionById]:`, err);
                reject(new Error('Erro ao buscar transação por ID.'));
            }
        });
    }

    static updateTransaction(id, transactionData) {
        return new Promise(async (resolve, reject) => {
            const { data, descricao, categoria, tipo, valor, cliente_id } = transactionData;
            const parsedValor = parseFloat(valor);
            if (isNaN(parsedValor) || parsedValor <= 0) {
                return reject(new Error('O valor da transação deve ser um número positivo.'));
            }
            if (tipo !== 'Ingreso' && tipo !== 'Gasto') {
                return reject(new Error('Tipo de transação inválido.'));
            }

            // Preparar a query com ou sem cliente_id dependendo se foi fornecido
            let query, params;
            if (cliente_id) {
                query = `
                    UPDATE transacoes
                    SET data = ?, descricao = ?, categoria = ?, tipo = ?, valor = ?, cliente_id = ?
                    WHERE id = ?
                `;
                params = [data, descricao, categoria, tipo, parsedValor, cliente_id, id];
            } else {
                query = `
                    UPDATE transacoes
                    SET data = ?, descricao = ?, categoria = ?, tipo = ?, valor = ?, cliente_id = NULL
                    WHERE id = ?
                `;
                params = [data, descricao, categoria, tipo, parsedValor, id];
            }

            try {
                const [result] = await db.promise().query(query, params);
                console.log(`[Model] updateTransaction ID ${id}:`, result);
                resolve(result);
            } catch (err) {
                console.error(`Erro DB [updateTransaction]:`, err);
                reject(new Error('Erro interno ao atualizar transação.'));
            }
        });
    }

    static async findAll(options = {}) {
        return this.listTransactions();
    }


    static async find(options = {}) {
        return this.findAll(options);
    }
}
