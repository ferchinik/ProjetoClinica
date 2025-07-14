// clinica/models/clientPhotoModel.js
import { db } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export default class ClientPhotoModel {

    /**
     * Cria um novo registro de fotos/vídeos para um cliente.
     * @param {object} data - Dados da mídia { cliente_id, foto_antes_path, foto_depois_path, media_type_antes, media_type_depois, descricao }
     * @returns {Promise<number>} ID do novo registro criado.
     */
    static async create(data) {
        const { cliente_id, foto_antes_path, foto_depois_path, media_type_antes = 'image', media_type_depois = 'image', descricao = null } = data;
        if (!cliente_id || !foto_antes_path || !foto_depois_path) {
            throw new Error('ID do cliente e caminhos das mídias são obrigatórios.');
        }

        const query = `
            INSERT INTO cliente_fotos
            (cliente_id, foto_antes_path, foto_depois_path, media_type_antes, media_type_depois, descricao, data_registro)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        const params = [cliente_id, foto_antes_path, foto_depois_path, media_type_antes, media_type_depois, descricao];

        try {
            console.log('[Model-Photo] Executando INSERT:', db.format(query, params));
            const [result] = await db.promise().query(query, params);
            if (result.insertId) {
                console.log(`[Model-Photo] Registro de mídia criado com ID: ${result.insertId}`);
                return result.insertId;
            } else {
                throw new Error('Falha ao criar registro de mídia no banco (sem insertId).');
            }
        } catch (error) {
            console.error('[Model-Photo] Erro ao criar registro de mídia:', error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_fotos_cliente')) {
                 throw new Error(`Cliente com ID ${cliente_id} não encontrado.`);
             }
            if (error.code === 'ER_BAD_NULL_ERROR' && (error.message.includes("'media_type_antes'") || error.message.includes("'media_type_depois'"))) {
                throw new Error('O tipo de mídia (media_type_antes e media_type_depois) é obrigatório.');
            }
            throw new Error('Erro no banco de dados ao salvar mídias.');
        }
    }

    /**
     * Busca todos os registros de mídias para um cliente específico.
     * @param {number} cliente_id 
     * @returns {Promise<Array<object>>} 
     */
    static async findByClientId(cliente_id) {
        if (!cliente_id) {
            throw new Error('ID do cliente é obrigatório para buscar mídias.');
        }
        const query = `
            SELECT id, cliente_id, foto_antes_path, foto_depois_path, media_type_antes, media_type_depois, descricao, data_registro
            FROM cliente_fotos
            WHERE cliente_id = ?
            ORDER BY data_registro DESC, id DESC
        `;
        try {
            console.log('[Model-Photo] Executando SELECT por cliente_id:', db.format(query, [cliente_id]));
            const [results] = await db.promise().query(query, [cliente_id]);
            console.log(`[Model-Photo] Encontrados ${results.length} registros de mídias para cliente ${cliente_id}.`);
            return results;
        } catch (error) {
            console.error(`[Model-Photo] Erro ao buscar mídias para cliente ${cliente_id}:`, error);
            throw new Error('Erro no banco de dados ao buscar mídias do cliente.');
        }
    }

     /**
      * Deleta um registro de mídia e os arquivos associados.
      * @param {number} id 
      * @returns {Promise<boolean>} 
      */
     static async delete(id) {
        if (!id) throw new Error('ID do registro de mídia é obrigatório para exclusão.');

        let connection;
        try {
            connection = await db.promise().getConnection();
            await connection.beginTransaction();

            console.log(`[Model-Photo] Buscando paths para deletar mídia ID: ${id}`);
            const [rows] = await connection.query('SELECT foto_antes_path, foto_depois_path FROM cliente_fotos WHERE id = ?', [id]);
            if (rows.length === 0) {
                await connection.rollback();
                connection.release();
                console.warn(`[Model-Photo] Registro de mídia ID ${id} não encontrado para exclusão.`);
                return false;
            }
            const { foto_antes_path, foto_depois_path } = rows[0];

            console.log(`[Model-Photo] Deletando registro do DB para mídia ID: ${id}`);
            const [deleteResult] = await connection.query('DELETE FROM cliente_fotos WHERE id = ?', [id]);

            if (deleteResult.affectedRows > 0) {
                console.log(`[Model-Photo] Registro ID ${id} deletado do DB. Tentando deletar arquivos...`);
                const deleteFileIfExists = async (filePath) => {
                    if (!filePath) return;
                    const absolutePath = path.join(projectRoot, filePath);
                    try {
                        await fs.access(absolutePath);
                        await fs.unlink(absolutePath);
                        console.log(`[Model-Photo] Arquivo deletado: ${absolutePath}`);
                    } catch (error) {
                        if (error.code !== 'ENOENT') {
                            console.error(`[Model-Photo] Erro ao deletar arquivo ${absolutePath}:`, error);
                        } else {
                             console.warn(`[Model-Photo] Arquivo não encontrado para deletar: ${absolutePath}`);
                        }
                    }
                };

                await deleteFileIfExists(foto_antes_path);
                await deleteFileIfExists(foto_depois_path);

                await connection.commit();
                console.log(`[Model-Photo] Exclusão completa para ID: ${id}`);
                connection.release();
                return true;

            } else {
                await connection.rollback();
                connection.release();
                console.warn(`[Model-Photo] Falha ao deletar registro ID ${id} do DB (affectedRows=0).`);
                return false;
            }

        } catch (error) {
            console.error(`[Model-Photo] Erro GERAL ao deletar mídia ID ${id}:`, error);
            if (connection) {
                try { await connection.rollback(); } catch (rbError) { console.error("Erro no Rollback:", rbError); }
                connection.release();
            }
            throw new Error('Erro no banco de dados ao excluir mídia.');
        }
     }
}