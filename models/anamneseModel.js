
// clinica/models/anamneseModel.js
import { db } from '../config/db.js';

export default class AnamneseModel {
    static async create(anamneseData) {
        console.log("%c[AnamneseModel-CREATE] Iniciando criação com dados:", "color: darkorange;", JSON.stringify(anamneseData, null, 2));
        const {
            cliente_id, data_anamnese, queixa_principal = null, historico_doenca_atual = null,
            antecedentes_pessoais = null, alergias = null, medicamentos_em_uso = null,
            habitos_vida = null, habitos_nocivos = null, antecedentes_familiares = null,
            rotina_cuidados_pele = null, procedimentos_esteticos_anteriores = null,
            expectativas_tratamento = null, observacoes_gerais = null
        } = anamneseData;

        if (!cliente_id || isNaN(parseInt(cliente_id))) { 
            console.error("[AnamneseModel-CREATE] ERRO: ID do cliente é inválido ou ausente.", cliente_id);
            throw new Error('ID do cliente é inválido ou ausente.');
        }
        if (!data_anamnese) {
            console.error("[AnamneseModel-CREATE] ERRO: Data da anamnese é obrigatória.");
            throw new Error('Data da anamnese é obrigatória.');
        }

        const query = `
            INSERT INTO cliente_anamneses (
                cliente_id, data_anamnese, queixa_principal, historico_doenca_atual,
                antecedentes_pessoais, alergias, medicamentos_em_uso, habitos_vida,
                habitos_nocivos, antecedentes_familiares, rotina_cuidados_pele,
                procedimentos_esteticos_anteriores, expectativas_tratamento, observacoes_gerais,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const params = [
            parseInt(cliente_id), data_anamnese, queixa_principal, historico_doenca_atual,
            antecedentes_pessoais, alergias, medicamentos_em_uso, habitos_vida,
            habitos_nocivos, antecedentes_familiares, rotina_cuidados_pele,
            procedimentos_esteticos_anteriores, expectativas_tratamento, observacoes_gerais
        ];

        console.log("[AnamneseModel-CREATE] Query SQL:", db.format(query, params));

        try {
            const [result] = await db.promise().query(query, params);
            if (result.insertId) {
                console.log(`[AnamneseModel-CREATE] Anamnese criada com sucesso! ID: ${result.insertId} para cliente ID: ${cliente_id}`);
                return result.insertId;
            } else {
                console.error("[AnamneseModel-CREATE] Falha ao criar anamnese (DB não retornou insertId). Resultado:", result);
                throw new Error('Falha ao criar registro de anamnese no banco de dados.');
            }
        } catch (error) {
            console.error("[AnamneseModel-CREATE] ERRO NO BANCO DE DADOS:", error.message, error.code, error.stack);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error(`Cliente com ID ${cliente_id} não encontrado. Verifique se o cliente existe.`);
            }
            throw new Error('Erro no banco de dados ao salvar anamnese.');
        }
    }

    static async findByClientId(cliente_id) {
        console.log(`%c[AnamneseModel-FIND_BY_CLIENT_ID] Buscando anamneses para cliente ID: ${cliente_id}`, "color: darkorange;");
        if (isNaN(parseInt(cliente_id))) {
            console.error("[AnamneseModel-FIND_BY_CLIENT_ID] ID do cliente inválido:", cliente_id);
            throw new Error('ID do cliente inválido fornecido para buscar anamneses.');
        }
        const query = `SELECT * FROM cliente_anamneses WHERE cliente_id = ? ORDER BY data_anamnese DESC, id DESC`;
        try {
            const [results] = await db.promise().query(query, [cliente_id]);
            console.log(`[AnamneseModel-FIND_BY_CLIENT_ID] Encontradas ${results.length} anamneses.`);
            return results;
        } catch (error) {
            console.error(`[AnamneseModel-FIND_BY_CLIENT_ID] Erro no DB:`, error.message, error.stack);
            throw new Error('Erro no banco de dados ao buscar anamneses do cliente.');
        }
    }

    static async findById(id) {
        console.log(`%c[AnamneseModel-FIND_BY_ID] Buscando anamnese ID: ${id}`, "color: darkorange;");
        if (isNaN(parseInt(id))) {
            console.error("[AnamneseModel-FIND_BY_ID] ID da anamnese inválido:", id);
            throw new Error('ID da anamnese inválido fornecido.');
        }
        const query = `SELECT * FROM cliente_anamneses WHERE id = ?`;
        try {
            const [results] = await db.promise().query(query, [id]);
            console.log("[AnamneseModel-FIND_BY_ID] Resultado:", results[0] || null);
            return results[0] || null;
        } catch (error) {
            console.error(`[AnamneseModel-FIND_BY_ID] Erro no DB:`, error.message, error.stack);
            throw new Error('Erro no banco de dados ao buscar anamnese por ID.');
        }
    }

    static async update(id, anamneseData) {
        console.log(`%c[AnamneseModel-UPDATE] Iniciando atualização para anamnese ID: ${id}`, "color: darkorange;");
        console.log("[AnamneseModel-UPDATE] Dados recebidos:", JSON.stringify(anamneseData, null, 2));

        if (isNaN(parseInt(id))) {
            console.error("[AnamneseModel-UPDATE] ERRO: ID da anamnese inválido para atualização.", id);
            throw new Error('ID da anamnese inválido para atualização.');
        }

    
        const { cliente_id, created_at, updated_at, id: anamneseIdFromData, ...dataToUpdate } = anamneseData;

        if (!dataToUpdate.data_anamnese) {
            console.error("[AnamneseModel-UPDATE] ERRO: Data da anamnese é obrigatória para atualização.");
            throw new Error('Data da anamnese é obrigatória para atualização.');
        }

        const fields = Object.keys(dataToUpdate)
            .map(key => `${key} = ?`)
            .join(', ');

        if (!fields) {
            console.warn("[AnamneseModel-UPDATE] Nenhum campo fornecido para atualização. Nenhuma alteração será feita.");
            return true; 
        }

        const params = [...Object.values(dataToUpdate), parseInt(id)];

        const query = `
            UPDATE cliente_anamneses SET
                ${fields},
                updated_at = NOW()
            WHERE id = ?
        `;
        console.log("[AnamneseModel-UPDATE] Query SQL:", db.format(query, params));

        try {
            const [result] = await db.promise().query(query, params);
            console.log(`[AnamneseModel-UPDATE] Resultado da atualização para ID ${id}: AffectedRows=${result.affectedRows}`);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`[AnamneseModel-UPDATE] ERRO NO BANCO DE DADOS ao atualizar anamnese ID ${id}:`, error.message, error.stack);
            throw new Error('Erro no banco de dados ao atualizar anamnese.');
        }
    }

    static async delete(id) { 
        console.log(`%c[AnamneseModel-DELETE] Tentando excluir anamnese ID: ${id}`, "color: darkorange;");
        if (isNaN(parseInt(id))) {
            console.error("[AnamneseModel-DELETE] ID da anamnese inválido para exclusão:", id);
            throw new Error('ID da anamnese inválido para exclusão.');
        }
        const query = 'DELETE FROM cliente_anamneses WHERE id = ?';
        try {
            const [result] = await db.promise().query(query, [id]);
            console.log(`[AnamneseModel-DELETE] Anamnese ID ${id} deletada. AffectedRows: ${result.affectedRows}`);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`[AnamneseModel-DELETE] Erro no DB ao deletar anamnese ID ${id}:`, error.message, error.stack);
            throw new Error('Erro no banco de dados ao deletar anamnese.');
        }
    }
}
