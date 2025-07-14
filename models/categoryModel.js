import { db } from '../config/db.js';

export default class CategoryModel {
    /**
     * Cria uma nova categoria se ela não existir pelo nome.
     * Se já existir, retorna o ID da categoria existente.
     * @param {string} nome 
     * @returns {Promise<number>}
     */
    static createCategory(nome) {
        return new Promise(async (resolve, reject) => {
            if (!nome || typeof nome !== 'string' || nome.trim() === '') {
                return reject(new Error('O nome da categoria não pode ser vazio.'));
            }
            const nomeTratado = nome.trim();

            try {
               
                const checkQuery = 'SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)';
                const [existingResults] = await db.promise().query(checkQuery, [nomeTratado]);

                if (existingResults.length > 0) {
                    console.log(`[CategoryModel] Categoria "${nomeTratado}" já existe com ID: ${existingResults[0].id}`);
                    resolve(existingResults[0].id);
                } else {
                    const insertQuery = 'INSERT INTO categorias (nome) VALUES (?)';
                    const [result] = await db.promise().query(insertQuery, [nomeTratado]);
                    console.log(`[CategoryModel] Nova categoria "${nomeTratado}" criada com ID: ${result.insertId}`);
                    resolve(result.insertId);
                }
            } catch (err) {
                console.error('[CategoryModel] Erro em createCategory:', err);
                reject(new Error(`Erro ao processar categoria "${nomeTratado}": ${err.message}`));
            }
        });
    }

    /**
     * Lista todas as categorias ordenadas por nome.
     * @returns {Promise<Array<object>>} 
     */
    static listCategories() {
        return new Promise(async (resolve, reject) => {
            const query = 'SELECT id, nome FROM categorias ORDER BY nome ASC';
            try {
                const [results] = await db.promise().query(query);
                resolve(results);
            } catch (err) {
                console.error('[CategoryModel] Erro ao listar categorias:', err);
                reject(new Error('Erro ao listar categorias do banco de dados.'));
            }
        });
    }

    /**
     * Busca uma categoria pelo seu ID.
     * @param {number} id 
     * @returns {Promise<object|null>} 
     */
    static findById(id) {
        return new Promise(async (resolve, reject) => {
            if (isNaN(parseInt(id))) {
                return reject(new Error('ID da categoria inválido.'));
            }
            const query = 'SELECT id, nome FROM categorias WHERE id = ?';
            try {
                const [results] = await db.promise().query(query, [id]);
                resolve(results[0] || null);
            } catch (err) {
                console.error(`[CategoryModel] Erro ao buscar categoria por ID ${id}:`, err);
                reject(new Error('Erro ao buscar categoria por ID.'));
            }
        });
    }


    /**
     * Deleta uma categoria pelo seu ID.
     * ATENÇÃO: Esta função não verifica se a categoria está em uso por produtos.
     * Você pode querer adicionar essa lógica ou tratar no nível do banco de dados (ON DELETE SET NULL / RESTRICT).
     * @param {number} id 
     * @returns {Promise<boolean>} T
     */
    static deleteCategoryById(id) {
        return new Promise(async (resolve, reject) => {
            if (isNaN(parseInt(id))) {
                return reject(new Error('ID da categoria inválido para exclusão.'));
            }

            const query = 'DELETE FROM categorias WHERE id = ?';
            try {
                const [result] = await db.promise().query(query, [id]);
                console.log(`[CategoryModel] Tentativa de deletar categoria ID ${id}. AffectedRows: ${result.affectedRows}`);
                resolve(result.affectedRows > 0);
            } catch (err) {
                console.error(`[CategoryModel] Erro ao deletar categoria ID ${id}:`, err);
                // Tratar erro de chave estrangeira se um produto ainda usa esta categoria e o DB restringe
                if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
                    reject(new Error('Não é possível excluir a categoria pois ela está em uso por um ou mais produtos.'));
                } else {
                    reject(new Error('Erro no banco de dados ao deletar categoria.'));
                }
            }
        });
    }
}
