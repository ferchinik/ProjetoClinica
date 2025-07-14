// clinica/models/productModel.js

import { db } from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const STOCK_THRESHOLDS = {
    critical_max: 0,
    low_max: 10,
    normal_max: 30,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export default class ProductModel {

    static async listProducts(categoryFilter = null, statusFilter = null, search = null, page = 1, limit = 12) {
        console.log(`\n[ProductModel.listProducts] ----- INÍCIO DA BUSCA DE PRODUTOS -----`);
        console.log(`[ProductModel.listProducts] Filtros Recebidos -> Categoria: '${categoryFilter}', Status: '${statusFilter}', Busca: '${search}', Página: ${page}, Limite: ${limit}`);

        try {
            let conditions = [];
            let queryParamsForWhere = [];
            let fromAndJoinClause = `FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id`;
            let selectFields = `p.id, p.titulo as nome, p.preco, p.estoque, p.foto, 
                                c.nome as categoria, p.created_at, p.updated_at, p.categoria_id`;

            if (categoryFilter && categoryFilter.trim() !== "") {
                const filterValue = categoryFilter.trim().toLowerCase();
                console.log(`[ProductModel.listProducts] Aplicando filtro de categoria (switch): '${filterValue}'`);

                let dbCategoryNameToQuery; 
                console.log(`[ProductModel.listProducts] Filtro de categoria recebido: '${filterValue}'`);

                switch (filterValue) {
                    case 'productos':
                        dbCategoryNameToQuery = 'productos';
                        break;
                    case 'consumibles':
                        dbCategoryNameToQuery = 'consumibles';
                        break;
                    case 'equipos':
                        dbCategoryNameToQuery = 'equipos';
                        break;
                    case 'otros':
                        dbCategoryNameToQuery = 'otros';
                        break;
                    case '__any_category__':
                        conditions.push('p.categoria_id IS NOT NULL');
                        console.log(`[ProductModel.listProducts] Categoria Cond: p.categoria_id IS NOT NULL`);
                        break;
                    default:
                        const parsedId = parseInt(filterValue, 10);
                        if (!isNaN(parsedId)) {
                            conditions.push('p.categoria_id = ?');
                            queryParamsForWhere.push(parsedId);
                            console.log(`[ProductModel.listProducts] Categoria Cond: p.categoria_id = ${parsedId} (fallback para ID)`);
                        } else {
                            console.log(`[ProductModel.listProducts] Categoria: "${filterValue}" não reconhecida. Nenhum filtro de nome de categoria aplicado.`);
                        }
                        break;
                }

                if (dbCategoryNameToQuery) {
                    conditions.push('LOWER(c.nome) = LOWER(?)');
                    queryParamsForWhere.push(dbCategoryNameToQuery);
                    console.log(`[ProductModel.listProducts] Categoria Cond: LOWER(c.nome) = '${dbCategoryNameToQuery}'`);
                }
            }

            if (statusFilter) {
                console.log(`[ProductModel.listProducts] Aplicando filtro de status: ${statusFilter}`);
                switch (statusFilter) {
                    case 'critical': conditions.push('p.estoque <= ?'); queryParamsForWhere.push(STOCK_THRESHOLDS.critical_max); break;
                    case 'warning': conditions.push('p.estoque > ? AND p.estoque <= ?'); queryParamsForWhere.push(STOCK_THRESHOLDS.critical_max, STOCK_THRESHOLDS.low_max); break;
                    case 'in-stock': conditions.push('p.estoque > ?'); queryParamsForWhere.push(STOCK_THRESHOLDS.low_max); break;
                }
            }

            if (search && typeof search === 'string' && search.trim() !== '') {
                const searchTerm = `%${search.trim()}%`;
                conditions.push('LOWER(p.titulo) LIKE LOWER(?)');
                queryParamsForWhere.push(searchTerm);
                console.log(`[ProductModel.listProducts] Aplicando filtro de busca (case-insensitive): ${searchTerm}`);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            console.log(`[ProductModel.listProducts] Cláusula WHERE construída: ${whereClause}`);
            console.log(`[ProductModel.listProducts] Parâmetros para WHERE (queryParamsForWhere):`, queryParamsForWhere);

            const countQuerySql = `SELECT COUNT(p.id) as total ${fromAndJoinClause} ${whereClause}`;
            console.log(`[ProductModel.listProducts] Query de Contagem Formatada: ${db.format(countQuerySql, queryParamsForWhere)}`);
            const [countResult] = await db.promise().query(countQuerySql, queryParamsForWhere);
            const totalItems = countResult[0].total;
            console.log(`[ProductModel.listProducts] Total de itens encontrados (contagem): ${totalItems}`);

            const totalPages = Math.ceil(totalItems / limit) || 1;
            page = Math.max(1, Math.min(page, totalPages));
            const offset = (page - 1) * limit;

            const mainQuerySql = `
                SELECT ${selectFields}
                ${fromAndJoinClause} ${whereClause}
                ORDER BY p.updated_at DESC, p.created_at DESC
                LIMIT ? OFFSET ?`;
            const finalMainParams = [...queryParamsForWhere, limit, offset];
            console.log(`[ProductModel.listProducts] Query Principal Formatada: ${db.format(mainQuerySql, finalMainParams)}`);

            const [products] = await db.promise().query(mainQuerySql, finalMainParams);
            console.log(`[ProductModel.listProducts] Produtos retornados pela query principal: ${products.length}`);
            console.log(`[ProductModel.listProducts] ----- FIM DA BUSCA DE PRODUTOS -----`);

            return {
                products: products.map(p => ({ ...p, preco: parseFloat(p.preco) || 0 })),
                totalPages,
                currentPage: parseInt(page),
                totalItems
            };
        } catch (error) {
            console.error('[ProductModel.listProducts] Erro detalhado em listProducts:', error);
            throw new Error('Erro ao buscar produtos do banco de dados. Verifique os logs do servidor para mais detalhes.');
        }
    }

    static async createProduct(productData) {
        const { titulo, preco, estoque, foto, categoria_id } = productData;
        if (!titulo || preco === undefined || estoque === undefined || !foto || categoria_id === undefined) {
            throw new Error('Título, preço, estoque, foto e categoria são obrigatórios.');
        }
        const parsedPreco = parseFloat(preco);
        if (isNaN(parsedPreco) || parsedPreco < 0) {
            throw new Error('Preço deve ser um número válido e não negativo.');
        }
        const parsedEstoque = parseInt(estoque, 10);
        if (isNaN(parsedEstoque) || parsedEstoque < 0) {
            throw new Error('Estoque deve ser um número inteiro não negativo.');
        }
        try {
            const query = `INSERT INTO produtos (titulo, preco, estoque, foto, categoria_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
            const params = [titulo, parsedPreco, parsedEstoque, foto, categoria_id];
            const [result] = await db.promise().query(query, params);
            if (result.insertId) {
                console.log(`[Model Success] Produto criado com ID: ${result.insertId}`);
                return result.insertId;
            } else {
                throw new Error('Não foi possível criar o produto. Resultado inesperado do DB.');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Já existe um produto com essas características.');
            }
            console.error('[Model Error] Erro ao criar produto:', error);
            throw new Error(error.message || 'Erro ao salvar produto no banco de dados');
        }
    }

    static async updateProduct(id, productData) {
        const { titulo, preco, estoque, foto, categoria_id } = productData;
        const fieldsToUpdate = [];
        const params = [];
        if (titulo !== undefined) { fieldsToUpdate.push('titulo = ?'); params.push(String(titulo).trim()); }
        if (preco !== undefined) {
            const parsedPreco = parseFloat(preco);
            if (isNaN(parsedPreco) || parsedPreco < 0) throw new Error('Preço inválido.');
            fieldsToUpdate.push('preco = ?'); params.push(parsedPreco);
        }
        if (estoque !== undefined) {
            const parsedEstoque = parseInt(estoque, 10);
            if (isNaN(parsedEstoque) || parsedEstoque < 0) throw new Error('Estoque inválido.');
            fieldsToUpdate.push('estoque = ?'); params.push(parsedEstoque);
        }
        if (foto !== undefined) { fieldsToUpdate.push('foto = ?'); params.push(foto); }
        if (categoria_id !== undefined) {
            const parsedCategoriaId = parseInt(categoria_id, 10);
            if (isNaN(parsedCategoriaId)) throw new Error('ID de categoria inválido.');
            fieldsToUpdate.push('categoria_id = ?'); params.push(parsedCategoriaId);
        }
        if (fieldsToUpdate.length === 0) {
            console.log(`[Model Info] Nenhuma alteração real detectada para o produto ID ${id}.`);
            return true;
        }
        fieldsToUpdate.push('updated_at = NOW()');
        params.push(id);
        try {
            const query = `UPDATE produtos SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
            const [result] = await db.promise().query(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Já existe outro produto com essas características.');
            }
            console.error(`[Model Error] Erro ao atualizar produto ID ${id}:`, error);
            throw new Error(error.message || 'Erro ao atualizar produto no banco de dados');
        }
    }

    static async deleteProduct(id) {
        let connection;
        try {
            connection = await db.promise().getConnection();
            await connection.beginTransaction();
            const [productResult] = await connection.query('SELECT foto FROM produtos WHERE id = ? FOR UPDATE', [id]);
            const product = productResult[0];
            if (!product) {
                await connection.rollback(); connection.release(); return false;
            }
            const [deleteResult] = await connection.query('DELETE FROM produtos WHERE id = ?', [id]);
            if (deleteResult.affectedRows === 0) {
                await connection.rollback(); connection.release(); return false;
            }
            if (product.foto) {
                const photoPath = path.join(projectRoot, product.foto);
                console.log(`[Model deleteProduct] Tentando deletar foto em: ${photoPath}`);
                try {
                    if (fs.existsSync(photoPath)) {
                        fs.unlinkSync(photoPath);
                        console.log(`[Model deleteProduct] Foto deletada: ${photoPath}`);
                    } else {
                        console.warn(`[Model deleteProduct] Foto não encontrada para deletar: ${photoPath}.`);
                    }
                } catch (unlinkError) {
                    console.error(`[Model Error] Erro ao deletar arquivo ${photoPath}:`, unlinkError.message);
                }
            }
            await connection.commit();
            connection.release();
            return true;
        } catch (error) {
            console.error('[Model Error GERAL] Erro ao deletar produto ID ' + id + ':', error);
            if (connection) {
                try { await connection.rollback(); } catch (rbError) { console.error("Erro Rollback:", rbError); }
                finally { connection.release(); }
            }
            throw new Error(error.message || 'Erro ao deletar produto.');
        }
    }

    static async getProductById(id) {
        try {
            const query = `
                 SELECT p.id, p.titulo, p.preco, p.estoque, p.foto, p.created_at, p.updated_at,
                        p.categoria_id, c.nome as categoria_nome
                 FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id
                 WHERE p.id = ?`;
            const [results] = await db.promise().query(query, [id]);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`[Model Error] Erro ao buscar produto ID ${id}:`, error);
            throw new Error('Erro ao buscar produto.');
        }
    }

    static async getCriticalStockProducts(threshold = STOCK_THRESHOLDS.low_max, limit = 5) {
        const query = `
            SELECT id, titulo, estoque FROM produtos
            WHERE estoque > 0 AND estoque <= ?
            ORDER BY estoque ASC, titulo ASC LIMIT ?`;
        try {
            const [products] = await db.promise().query(query, [threshold, limit]);
            return products;
        } catch (error) {
            console.error("Erro DB [getCriticalStockProducts]:", error);
            return [];
        }
    }

    static async getStockStatusCounts() {
        const query = `
            SELECT
                SUM(CASE WHEN estoque > 0 AND estoque <= ? THEN 1 ELSE 0 END) as lowCount,
                SUM(CASE WHEN estoque > ? AND estoque <= ? THEN 1 ELSE 0 END) as normalCount,
                SUM(CASE WHEN estoque > ? THEN 1 ELSE 0 END) as optimalCount,
                SUM(CASE WHEN estoque <= ? THEN 1 ELSE 0 END) as criticalCount
            FROM produtos`;
        const params = [
            STOCK_THRESHOLDS.low_max,       
            STOCK_THRESHOLDS.low_max,       
            STOCK_THRESHOLDS.normal_max,    
            STOCK_THRESHOLDS.normal_max,   
            STOCK_THRESHOLDS.critical_max   
        ];
        try {
            const [results] = await db.promise().query(query, params);
            return {
                low: parseInt(results[0]?.lowCount, 10) || 0,
                normal: parseInt(results[0]?.normalCount, 10) || 0,
                optimal: parseInt(results[0]?.optimalCount, 10) || 0,
                critical: parseInt(results[0]?.criticalCount, 10) || 0,
            };
        } catch (error) {
            console.error("Erro DB [getStockStatusCounts]:", error);
            return { low: 0, normal: 0, optimal: 0, critical: 0 };
        }
    }
}