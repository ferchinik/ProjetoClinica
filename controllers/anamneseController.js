import AnamneseModel from '../models/anamneseModel.js';

export default class AnamneseController {
    static async create(req, res) {
        const clienteIdParam = req.params.cliente_id;
        console.log(`%c[AnamneseCtrl-CREATE] Recebido POST para cliente ID (URL): ${clienteIdParam}`, "color: blue; font-weight:bold;");
        console.log("[AnamneseCtrl-CREATE] Body recebido:", JSON.stringify(req.body, null, 2));

        try {
            const anamneseDataFromRequest = { ...req.body };
            delete anamneseDataFromRequest.id;

            const finalAnamneseData = {
                ...anamneseDataFromRequest,
                cliente_id: parseInt(clienteIdParam)
            };

            console.log("[AnamneseCtrl-CREATE] Dados finais para o Model:", JSON.stringify(finalAnamneseData, null, 2));

            if (!finalAnamneseData.data_anamnese) {
                console.warn("[AnamneseCtrl-CREATE] Validação falhou: Data da anamnese é obrigatória.");
                return res.status(400).json({ success: false, message: 'Data da anamnese é obrigatória.' });
            }
            if (isNaN(finalAnamneseData.cliente_id)) {
                console.warn("[AnamneseCtrl-CREATE] Validação falhou: ID do cliente da URL é inválido.");
                return res.status(400).json({ success: false, message: 'ID do cliente inválido na URL.' });
            }

            const newAnamneseId = await AnamneseModel.create(finalAnamneseData);
            console.log(`[AnamneseCtrl-CREATE] Anamnese registrada com sucesso! Novo ID: ${newAnamneseId}`);
            res.status(201).json({
                success: true,
                message: 'Anamnese registrada com sucesso!',
                anamneseId: newAnamneseId
            });
        } catch (error) {
            console.error("[AnamneseCtrl-CREATE] ERRO DETALHADO:", error.message, error.stack);
            let statusCode = 500;
            let message = error.message || 'Erro interno ao registrar anamnese.';
            if (error.message.includes('obrigatória') || error.message.includes('inválido')) {
                statusCode = 400;
            } else if (error.message.includes('não encontrado')) {
                statusCode = 404;
            }
            res.status(statusCode).json({ success: false, message: message });
        }
    }

    static async listByClient(req, res) {
        const clienteId = req.params.cliente_id;
        console.log(`%c[AnamneseCtrl-LIST] Recebido GET para cliente ID: ${clienteId}`, "color: blue; font-weight:bold;");
        if (!clienteId || isNaN(parseInt(clienteId))) {
            console.warn("[AnamneseCtrl-LIST] ID do cliente inválido:", clienteId);
            return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
        }
        try {
            const anamneses = await AnamneseModel.findByClientId(parseInt(clienteId));
            console.log(`[AnamneseCtrl-LIST] Encontradas ${anamneses.length} anamneses para cliente ID: ${clienteId}`);
            res.status(200).json({ success: true, anamneses: anamneses });
        } catch (error) {
            console.error(`[AnamneseCtrl-LIST] Erro ao buscar anamneses para cliente ${clienteId}:`, error.message, error.stack);
            res.status(500).json({ success: false, message: error.message || 'Erro ao buscar anamneses.' });
        }
    }

    static async getById(req, res) {
        const anamneseId = req.params.id;
        console.log(`%c[AnamneseCtrl-GETBYID] Recebido GET para anamnese ID: ${anamneseId}`, "color: blue; font-weight:bold;");
        if (!anamneseId || isNaN(parseInt(anamneseId))) {
            console.warn("[AnamneseCtrl-GETBYID] ID da anamnese inválido:", anamneseId);
            return res.status(400).json({ success: false, message: 'ID da anamnese inválido.' });
        }
        try {
            const anamnese = await AnamneseModel.findById(parseInt(anamneseId));
            if (anamnese) {
                console.log("[AnamneseCtrl-GETBYID] Anamnese encontrada:", anamnese);
                res.status(200).json({ success: true, anamnese });
            } else {
                console.warn("[AnamneseCtrl-GETBYID] Anamnese não encontrada para ID:", anamneseId);
                res.status(404).json({ success: false, message: 'Anamnese não encontrada.' });
            }
        } catch (error) {
            console.error(`[AnamneseCtrl-GETBYID] Erro ao buscar anamnese ID ${anamneseId}:`, error.message, error.stack);
            res.status(500).json({ success: false, message: error.message || 'Erro ao buscar anamnese.' });
        }
    }

    static async update(req, res) {
        const anamneseIdParam = req.params.id;
        console.log(`%c[AnamneseCtrl-UPDATE] Recebido PUT para anamnese ID (URL): ${anamneseIdParam}`, "color: blue; font-weight:bold;");
        console.log("[AnamneseCtrl-UPDATE] Body recebido:", JSON.stringify(req.body, null, 2));

        if (!anamneseIdParam || isNaN(parseInt(anamneseIdParam))) {
            console.warn("[AnamneseCtrl-UPDATE] Validação falhou: ID da anamnese na URL é inválido.");
            return res.status(400).json({ success: false, message: 'ID da anamnese inválido na URL.' });
        }
        
        try {
            const anamneseDataFromRequest = { ...req.body };

            console.log("[AnamneseCtrl-UPDATE] Dados para o Model (antes do Model filtrar campos):", JSON.stringify(anamneseDataFromRequest, null, 2));

            if (!anamneseDataFromRequest.data_anamnese) {
                console.warn("[AnamneseCtrl-UPDATE] Validação falhou: Data da anamnese é obrigatória para atualizar.");
                return res.status(400).json({ success: false, message: 'Data da anamnese é obrigatória para atualizar.' });
            }
            
            const updated = await AnamneseModel.update(parseInt(anamneseIdParam), anamneseDataFromRequest);
            if (updated) {
                console.log(`[AnamneseCtrl-UPDATE] Anamnese ID ${anamneseIdParam} atualizada com sucesso!`);
                res.status(200).json({ success: true, message: 'Anamnese atualizada com sucesso!' });
            } else {
                console.warn(`[AnamneseCtrl-UPDATE] Anamnese ID ${anamneseIdParam} não encontrada para atualizar ou nenhuma linha afetada.`);
                res.status(404).json({ success: false, message: 'Anamnese não encontrada para atualizar.' });
            }
        } catch (error) {
            console.error(`[AnamneseCtrl-UPDATE] ERRO DETALHADO ao atualizar anamnese ID ${anamneseIdParam}:`, error.message, error.stack);
            let statusCode = 500;
            let message = error.message || 'Erro interno ao atualizar anamnese.';
            if (error.message.includes('obrigatória') || error.message.includes('inválid')) {
                statusCode = 400;
            }
            res.status(statusCode).json({ success: false, message: message });
        }
    }
}
