// clinica/models/medidasModel.js
import { db } from '../config/db.js';

export default class MedidasModel {

    /**
     * Cria um novo registro de medidas para um cliente.
     * @param {object} medidaData - Dados das medidas.
     * @returns {Promise<number>} ID do novo registro criado.
     */
    static async create(medidaData) {
        const {
            cliente_id, data_medicao, peso_kg, altura_cm,
            circ_braco_d_cm, circ_braco_e_cm, circ_antebraco_d_cm, circ_antebraco_e_cm,
            circ_peitoral_cm, circ_abdomen_cm, circ_cintura_cm, circ_quadril_cm,
            circ_coxa_d_cm, circ_coxa_e_cm, circ_panturrilha_d_cm, circ_panturrilha_e_cm,
            perc_gordura_corporal, massa_muscular_kg, observacoes
        } = medidaData;
        if (!cliente_id || !data_medicao) {
            throw new Error('ID do cliente e data da medição são obrigatórios.');
        }

        let imc = null;
        if (peso_kg && altura_cm && parseFloat(altura_cm) > 0) {
            const altura_m = parseFloat(altura_cm) / 100;
            imc = (parseFloat(peso_kg) / (altura_m * altura_m)).toFixed(2);
        }

        const query = `
            INSERT INTO cliente_medidas (
                cliente_id, data_medicao, peso_kg, altura_cm, imc,
                circ_braco_d_cm, circ_braco_e_cm, circ_antebraco_d_cm, circ_antebraco_e_cm,
                circ_peitoral_cm, circ_abdomen_cm, circ_cintura_cm, circ_quadril_cm,
                circ_coxa_d_cm, circ_coxa_e_cm, circ_panturrilha_d_cm, circ_panturrilha_e_cm,
                perc_gordura_corporal, massa_muscular_kg, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            cliente_id, data_medicao, peso_kg || null, altura_cm || null, imc,
            circ_braco_d_cm || null, circ_braco_e_cm || null, circ_antebraco_d_cm || null, circ_antebraco_e_cm || null,
            circ_peitoral_cm || null, circ_abdomen_cm || null, circ_cintura_cm || null, circ_quadril_cm || null,
            circ_coxa_d_cm || null, circ_coxa_e_cm || null, circ_panturrilha_d_cm || null, circ_panturrilha_e_cm || null,
            perc_gordura_corporal || null, massa_muscular_kg || null, observacoes || null
        ];

        try {
            console.log('[MedidasModel-create] Executando INSERT:', db.format(query, params));
            const [result] = await db.promise().query(query, params);
            if (result.insertId) {
                console.log(`[MedidasModel-create] Registro de medidas criado com ID: ${result.insertId}`);
                return result.insertId;
            } else {
                throw new Error('Falha ao criar registro de medidas (sem insertId).');
            }
        } catch (error) {
            console.error('[MedidasModel-create] Erro ao criar registro de medidas:', error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') { // FK constraint
                 throw new Error(`Cliente com ID ${cliente_id} não encontrado.`);
            }
            throw new Error('Erro no banco de dados ao salvar medidas.');
        }
    }

    /**
     * Busca todos os registros de medidas para um cliente específico.
     * @param {number} cliente_id - ID do cliente.
     * @returns {Promise<Array<object>>} Array com os registros de medidas.
     */
    static async findByClientId(cliente_id) {
        if (!cliente_id) {
            throw new Error('ID do cliente é obrigatório para buscar medidas.');
        }
        const query = `
            SELECT * FROM cliente_medidas
            WHERE cliente_id = ?
            ORDER BY data_medicao DESC, id DESC
        `;
        try {
            console.log('[MedidasModel-findByClientId] Executando SELECT por cliente_id:', db.format(query, [cliente_id]));
            const [results] = await db.promise().query(query, [cliente_id]);
            console.log(`[MedidasModel-findByClientId] Encontrados ${results.length} registros de medidas para cliente ${cliente_id}.`);
            return results;
        } catch (error) {
            console.error(`[MedidasModel-findByClientId] Erro ao buscar medidas para cliente ${cliente_id}:`, error);
            throw new Error('Erro no banco de dados ao buscar medidas do cliente.');
        }
    }

    /**
     * Busca um registro de medida específico pelo seu ID.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    static async findById(id) {
        const query = 'SELECT * FROM cliente_medidas WHERE id = ?';
        try {
            const [results] = await db.promise().query(query, [id]);
            return results[0] || null;
        } catch (error) {
            console.error(`[MedidasModel-findById] Erro ao buscar medida ID ${id}:`, error);
            throw new Error('Erro no banco de dados ao buscar medida por ID.');
        }
    }

    /**
     * Atualiza um registro de medidas existente.
     * @param {number} id - 
     * @param {object} medidaData 
     * @returns {Promise<boolean>} 
     */
    static async update(id, medidaData) {
        const {
            data_medicao, peso_kg, altura_cm,
            circ_braco_d_cm, circ_braco_e_cm, circ_antebraco_d_cm, circ_antebraco_e_cm,
            circ_peitoral_cm, circ_abdomen_cm, circ_cintura_cm, circ_quadril_cm,
            circ_coxa_d_cm, circ_coxa_e_cm, circ_panturrilha_d_cm, circ_panturrilha_e_cm,
            perc_gordura_corporal, massa_muscular_kg, observacoes
        } = medidaData;

        if (!data_medicao) { 
            throw new Error('Data da medição é obrigatória para atualização.');
        }

        let imc = null;
        if (peso_kg && altura_cm && parseFloat(altura_cm) > 0) {
            const altura_m = parseFloat(altura_cm) / 100;
            imc = (parseFloat(peso_kg) / (altura_m * altura_m)).toFixed(2);
        }

        const query = `
            UPDATE cliente_medidas SET
                data_medicao = ?, peso_kg = ?, altura_cm = ?, imc = ?,
                circ_braco_d_cm = ?, circ_braco_e_cm = ?, circ_antebraco_d_cm = ?, circ_antebraco_e_cm = ?,
                circ_peitoral_cm = ?, circ_abdomen_cm = ?, circ_cintura_cm = ?, circ_quadril_cm = ?,
                circ_coxa_d_cm = ?, circ_coxa_e_cm = ?, circ_panturrilha_d_cm = ?, circ_panturrilha_e_cm = ?,
                perc_gordura_corporal = ?, massa_muscular_kg = ?, observacoes = ?,
                updated_at = NOW()
            WHERE id = ?
        `;
        const params = [
            data_medicao, peso_kg || null, altura_cm || null, imc,
            circ_braco_d_cm || null, circ_braco_e_cm || null, circ_antebraco_d_cm || null, circ_antebraco_e_cm || null,
            circ_peitoral_cm || null, circ_abdomen_cm || null, circ_cintura_cm || null, circ_quadril_cm || null,
            circ_coxa_d_cm || null, circ_coxa_e_cm || null, circ_panturrilha_d_cm || null, circ_panturrilha_e_cm || null,
            perc_gordura_corporal || null, massa_muscular_kg || null, observacoes || null,
            id
        ];

        try {
            const [result] = await db.promise().query(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`[MedidasModel-update] Erro ao atualizar medida ID ${id}:`, error);
            throw new Error('Erro no banco de dados ao atualizar medidas.');
        }
    }

    /**
     * Deleta um registro de medidas.
     * @param {number} id 
     * @returns {Promise<boolean>}
     */
    static async delete(id) {
        const query = 'DELETE FROM cliente_medidas WHERE id = ?';
        try {
            const [result] = await db.promise().query(query, [id]);
            if (result.affectedRows > 0) {
                console.log(`[MedidasModel-delete] Registro de medida ID ${id} deletado.`);
                return true;
            }
            return false; 
        } catch (error) {
            console.error(`[MedidasModel-delete] Erro ao deletar medida ID ${id}:`, error);
            throw new Error('Erro no banco de dados ao deletar medida.');
        }
    }
}