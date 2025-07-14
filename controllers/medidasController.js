// clinica/controllers/medidasController.js
import MedidasModel from '../models/medidasModel.js';

export default class MedidasController {

    /**
     * Cria um novo registro de medidas para um cliente.
     * POST /api/clientes/:cliente_id/medidas
     */
    static async create(req, res) {
        const clienteId = req.params.cliente_id;
        console.log(`[MedidasController-create] Recebido POST para cliente ID: ${clienteId} com body:`, req.body);

        try {
            const medidaData = { ...req.body, cliente_id: parseInt(clienteId) };

            // Validação básica de campos obrigatórios
            if (!medidaData.data_medicao) {
                return res.status(400).json({ success: false, message: 'Data da medição é obrigatória.' });
            }
            // Adicione mais validações aqui conforme necessário (ex: peso, altura devem ser números)

            const newMedidaId = await MedidasModel.create(medidaData);
            res.status(201).json({
                success: true,
                message: 'Medidas corporais registradas com sucesso!',
                medidaId: newMedidaId
            });
        } catch (error) {
            console.error("[MedidasController-create] Erro ao registrar medidas:", error);
            let statusCode = 500;
            if (error.message.includes('obrigatórios') || error.message.includes('não encontrado') || error.message.includes('inválido')) {
                statusCode = 400; // Bad Request ou Not Found (para cliente_id)
            }
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno ao registrar medidas.' });
        }
    }

    /**
     * Lista as medidas de um cliente específico.
     * GET /api/clientes/:cliente_id/medidas
     */
    static async listByClient(req, res) {
        const clienteId = req.params.cliente_id;
        if (!clienteId || isNaN(parseInt(clienteId))) {
            return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
        }
        console.log(`[MedidasController-listByClient] Recebido GET para cliente ID: ${clienteId}`);

        try {
            const medidas = await MedidasModel.findByClientId(parseInt(clienteId));
            res.status(200).json({ success: true, medidas: medidas });
        } catch (error) {
            console.error(`[MedidasController-listByClient] Erro ao listar medidas para cliente ${clienteId}:`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar medidas.' });
        }
    }

    /**
     * Busca uma medida específica pelo ID (opcional, se for editar individualmente).
     * GET /api/medidas/:id
     */
    static async getById(req, res) {
        const medidaId = req.params.id;
        if (!medidaId || isNaN(parseInt(medidaId))) {
            return res.status(400).json({ success: false, message: 'ID da medida inválido.' });
        }
        console.log(`[MedidasController-getById] Recebido GET para medida ID: ${medidaId}`);
        try {
            const medida = await MedidasModel.findById(parseInt(medidaId));
            if (medida) {
                res.status(200).json({ success: true, medida });
            } else {
                res.status(404).json({ success: false, message: 'Registro de medida não encontrado.' });
            }
        } catch (error) {
            console.error(`[MedidasController-getById] Erro ao buscar medida ID ${medidaId}:`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar medida.' });
        }
    }

    /**
     * Atualiza um registro de medidas.
     * PUT /api/medidas/:id
     */
    static async update(req, res) {
        const medidaId = req.params.id;
        console.log(`[MedidasController-update] Recebido PUT para medida ID: ${medidaId} com body:`, req.body);

        if (!medidaId || isNaN(parseInt(medidaId))) {
            return res.status(400).json({ success: false, message: 'ID da medida inválido.' });
        }
        try {
            const medidaData = req.body;
            // Validação básica de campos obrigatórios para atualização
            if (!medidaData.data_medicao) {
                return res.status(400).json({ success: false, message: 'Data da medição é obrigatória para atualizar.' });
            }
            // Adicione mais validações aqui

            const updated = await MedidasModel.update(parseInt(medidaId), medidaData);
            if (updated) {
                res.status(200).json({ success: true, message: 'Registro de medidas atualizado com sucesso!' });
            } else {
                res.status(404).json({ success: false, message: 'Registro de medidas não encontrado para atualizar.' });
            }
        } catch (error) {
            console.error(`[MedidasController-update] Erro ao atualizar medida ID ${medidaId}:`, error);
            const statusCode = error.message.includes('obrigatória') || error.message.includes('inválid') ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno ao atualizar medidas.' });
        }
    }

    /**
     * Deleta um registro de medidas.
     * DELETE /api/medidas/:id
     */
    static async delete(req, res) {
        const medidaId = req.params.id;
        console.log(`[MedidasController-delete] Recebido DELETE para medida ID: ${medidaId}`);

        if (!medidaId || isNaN(parseInt(medidaId))) {
            return res.status(400).json({ success: false, message: 'ID da medida inválido.' });
        }
        try {
            const deleted = await MedidasModel.delete(parseInt(medidaId));
            if (deleted) {
                res.status(200).json({ success: true, message: 'Registro de medidas excluído com sucesso!' });
            } else {
                res.status(404).json({ success: false, message: 'Registro de medidas não encontrado para excluir.' });
            }
        } catch (error) {
            console.error(`[MedidasController-delete] Erro ao excluir medida ID ${medidaId}:`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao excluir medida.' });
        }
    }
}