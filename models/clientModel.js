// clinica/models/clientModel.js
import { db } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ClientModel {
    static createClient(clientData) {
        return new Promise((resolve, reject) => {
            const { nome_completo, email, telefone, data_nascimento = null, endereco = null, cidade = null, documento_identidade = null, profissao = null, observacoes = null, foto_perfil = null } = clientData;
            if (!nome_completo || !email || !telefone) { console.error("Model Error: Tentativa de criar cliente sem nome, email ou telefone."); return reject(new Error('Nome completo, email e telefone são obrigatórios.')); }
            const query = ` INSERT INTO clientes ( nome_completo, email, telefone, data_nascimento, endereco, cidade, documento_identidade, profissao, observacoes, foto_perfil, data_cadastro, ultima_visita ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL) `;
            const params = [nome_completo, email, telefone, data_nascimento, endereco, cidade, documento_identidade, profissao, observacoes, foto_perfil];
            db.query(query, params, (err, result) => {
                if (err) { console.error(`Erro DB [createClient] ao inserir cliente "${nome_completo}":`, err); if (err.code === 'ER_DUP_ENTRY') { return reject(new Error('Este email ou documento já está cadastrado.')); } return reject(new Error('Erro interno ao salvar cliente no banco de dados.')); }
                if (result && result.insertId) { console.log(`Model Success: Cliente "${nome_completo}" criado com ID: ${result.insertId}`); resolve(result.insertId); }
                else { console.error("Model Error: Falha ao obter insertId após INSERT em clientes."); reject(new Error('Não foi possível criar o cliente (DB não retornou ID).')); }
            });
        });
    }
    static listClients(searchTerm = null, page = 1, limit = 10) {
        return new Promise(async (resolve, reject) => {
            try {
                let countQuery = `SELECT COUNT(*) AS total FROM clientes`;
                const conditions = []; const paramsCount = [];
                if (searchTerm && searchTerm.trim() !== '') { conditions.push('nome_completo LIKE ?'); paramsCount.push(`%${searchTerm.trim()}%`); }
                if (conditions.length > 0) countQuery += ' WHERE ' + conditions.join(' AND ');
                const [countResult] = await db.promise().query(countQuery, paramsCount);
                const totalItems = countResult[0].total; const totalPages = Math.ceil(totalItems / limit);
                page = Math.max(1, Math.min(page, totalPages || 1)); const offset = (page - 1) * limit;
                let query = ` SELECT id, nome_completo, email, telefone, foto_perfil, ultima_visita FROM clientes `;
                if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
                query += ' ORDER BY nome_completo ASC LIMIT ? OFFSET ?';
                const finalParams = [...paramsCount, limit, offset];
                const [results] = await db.promise().query(query, finalParams);
                resolve({ clients: results, totalPages: totalPages, currentPage: page, totalItems: totalItems });
            } catch (error) { console.error("Erro DB [listClients]:", error); reject(new Error('Erro ao recuperar lista de clientes.')); }
        });
    }

    static async getBirthdaysToday() {
        const query = `SELECT id, nome_completo, foto_perfil, data_nascimento, telefone FROM clientes WHERE data_nascimento IS NOT NULL AND MONTH(data_nascimento) = MONTH(CURRENT_DATE()) AND DAY(data_nascimento) = DAY(CURRENT_DATE()) ORDER BY nome_completo ASC`;
        try {
            const [results] = await db.promise().query(query);
            return results;
        }
        catch (error) {
            console.error("Erro DB [getBirthdaysToday]:", error);
            return [];
        }
    }

    static async getUpcomingBirthdays(daysAhead = 30, limit = 5) {
        console.log(`[ClientModel] getUpcomingBirthdays - Buscando ${limit} aniversários nos próximos ${daysAhead} dias.`);
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const endDate = new Date(today); endDate.setDate(today.getDate() + daysAhead);
        const tomorrowMonth = tomorrow.getMonth() + 1; const tomorrowDay = tomorrow.getDate();
        const endMonth = endDate.getMonth() + 1; const endDay = endDate.getDate();
        let whereClause = ''; let params = [];
        if (tomorrow.getFullYear() === endDate.getFullYear()) {
            whereClause = ` ( (MONTH(data_nascimento) = ? AND DAY(data_nascimento) >= ?) OR (MONTH(data_nascimento) > ? AND MONTH(data_nascimento) < ?) OR (MONTH(data_nascimento) = ? AND DAY(data_nascimento) <= ?) ) `;
            params = [tomorrowMonth, tomorrowDay, tomorrowMonth, endMonth, endMonth, endDay];
        } else {
            whereClause = ` ( (MONTH(data_nascimento) = ? AND DAY(data_nascimento) >= ?) OR MONTH(data_nascimento) > ? ) OR ( MONTH(data_nascimento) < ? OR (MONTH(data_nascimento) = ? AND DAY(data_nascimento) <= ?) ) `;
            params = [tomorrowMonth, tomorrowDay, tomorrowMonth, endMonth, endMonth, endDay];
        }
        params.push(limit);
        const query = ` SELECT id, nome_completo, foto_perfil, data_nascimento, telefone FROM clientes WHERE data_nascimento IS NOT NULL AND ${whereClause} ORDER BY CASE WHEN MONTH(data_nascimento) < MONTH(CURRENT_DATE()) THEN MONTH(data_nascimento) + 12 WHEN MONTH(data_nascimento) = MONTH(CURRENT_DATE()) AND DAY(data_nascimento) < DAY(CURRENT_DATE()) THEN MONTH(data_nascimento) + 12 ELSE MONTH(data_nascimento) END, DAY(data_nascimento) LIMIT ?; `;
        try {
            const [results] = await db.promise().query(query, params);
            console.log(`[ClientModel] getUpcomingBirthdays - Encontrados: ${results.length}`);
            return results;
        }
        catch (error) {
            console.error(`Erro DB [getUpcomingBirthdays(${daysAhead})]:`, error);
            throw new Error('Erro ao buscar próximos aniversariantes.');
        }
    }
    static async getFullClientDetailsById(id) {
        console.log(`[Model] Buscando detalhes completos para cliente ID: ${id}`);
        try {
            const clientQuery = `
                SELECT 
                    c.*, 
                    DATE_FORMAT(c.data_nascimento, '%d/%m/%Y') as data_nasc_formatada, 
                    TIMESTAMPDIFF(YEAR, c.data_nascimento, CURDATE()) as idade, 
                    DATE_FORMAT(c.data_cadastro, '%d/%m/%Y') as primeira_visita,
                    (SELECT MAX(a.data_hora) FROM agendamentos a WHERE a.cliente_id = c.id AND a.status = 'Realizado') as ultima_visita_calculada
                FROM clientes c 
                WHERE c.id = ?
            `;
            const [clientResults] = await db.promise().query(clientQuery, [id]);
            
            if (clientResults.length === 0) { 
                console.log("[Model] Cliente não encontrado."); 
                return null; 
            }
            
            const clientBaseData = clientResults[0];
            const [stats, timeline, upcomingAppointments] = await Promise.all([
                this.getClientStatsByIdOrName(id, clientBaseData.nome_completo),
                this.getClientTimelineByIdOrName(id),
                this.getUpcomingAppointmentsByIdOrName(id)
            ]);
            const fullClientData = { 
                ...clientBaseData, 
                ultima_visita: clientBaseData.ultima_visita_calculada, 
                totalCitas: stats.totalCitas, 
                inversionTotal: stats.inversionTotal, 
                timeline: timeline, 
                proximasCitas: upcomingAppointments 
            };
            
            console.log(`[Model] Detalhes completos encontrados para cliente ID: ${id}`);
            return fullClientData;

        } catch (error) {
            console.error(`[Model] Erro ao buscar detalhes completos para cliente ID ${id}:`, error);
            throw new Error('Erro interno ao buscar detalhes completos do cliente.');
        }
    }


    static async getClientStatsByIdOrName(clientId) {
        console.log(`%c[ClientModel DEBUG] getClientStatsByIdOrName chamado com: clientId=${clientId}`, 'color: teal; font-weight: bold;');
        try {
            const statsQuery = `
                SELECT 
                    (SELECT MAX(a.data_hora) FROM agendamentos a WHERE a.cliente_id = ? AND a.status = 'Realizado') as ultima_visita,
                    COUNT(a.id) as totalCitas,
                    SUM(t.valor) as inversionTotal
                FROM agendamentos a
                LEFT JOIN transacoes t ON a.id = t.agendamento_id AND t.tipo = 'Ingreso'
                WHERE a.cliente_id = ? AND a.status = 'Realizado'
            `;
            const params = [clientId, clientId];
            const [statsResults] = await db.promise().query(statsQuery, params);
            const stats = statsResults[0];
            return {
                totalCitas: stats?.totalCitas || 0,
                inversionTotal: parseFloat(stats?.inversionTotal) || 0.00,
                ultima_visita: stats?.ultima_visita
            };
        } catch (error) {
            console.error(`Erro ao buscar estatísticas para o cliente ${clientId}:`, error);
            return { totalCitas: 0, inversionTotal: 0.00, ultima_visita: null };
        }
    }

    static async getClientTimelineByIdOrName(clientId) {
        console.log(`%c[ClientModel DEBUG] getClientTimelineByIdOrName chamado com: clientId=${clientId}`, 'color: teal; font-weight: bold;');
        try {
            const timelineQuery = `
                SELECT DATE_FORMAT(a.data_hora, '%d/%m/%Y') as data_formatada,
                       TIME_FORMAT(a.data_hora, '%H:%i') as hora_formatada,
                       a.tipo_consulta as procedimento, a.observacoes, r.nombre as nome_profissional
                FROM agendamentos a
                LEFT JOIN registro r ON a.profissional_id = r.id
                WHERE a.cliente_id = ?
                  AND a.status = 'Realizado'
                ORDER BY a.data_hora DESC
                LIMIT 10`;
            const params = [clientId];
            console.log(`%c[ClientModel DEBUG] Executando query para timeline:`, 'color: teal;', db.format(timelineQuery, params));
            const [timelineResults] = await db.promise().query(timelineQuery, params);
            console.log(`%c[ClientModel DEBUG] Resultado da query para timeline:`, 'color: teal;', timelineResults);
            return timelineResults.map(item => ({ ...item, tags: item.procedimento ? item.procedimento.split(' ').slice(0, 2).map(tag => tag.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) : [] }));
        } catch (error) {
            console.error(`%c[ClientModel DEBUG] Erro timeline cliente ${clientId}:`, 'color: red; font-weight: bold;', error);
            return [];
        }
    }

    static async getUpcomingAppointmentsByIdOrName(clientId) {
        console.log(`%c[ClientModel DEBUG] getUpcomingAppointmentsByIdOrName chamado com: clientId=${clientId}`, 'color: blue; font-weight: bold;');
        try {
            const upcomingQuery = `
                SELECT a.id, a.data_hora, DATE_FORMAT(a.data_hora, '%H:%i') as hora_formatada,
                       DATE_FORMAT(a.data_hora, '%d') as dia, DATE_FORMAT(a.data_hora, '%b') as mes_abrev,
                       a.tipo_consulta as procedimento, a.status, r.nombre as nome_profissional
                FROM agendamentos a
                LEFT JOIN registro r ON a.profissional_id = r.id
                WHERE a.cliente_id = ?
                  AND a.data_hora >= CURDATE()
                  AND a.status IN ('Pendente', 'Confirmado')
                ORDER BY a.data_hora ASC
                LIMIT 5`;
            const params = [clientId];
            const formattedQuery = db.format(upcomingQuery, params);
            console.log(`%c[ClientModel DEBUG] Executando query para próximas citas:`, 'color: blue;', formattedQuery);
            const [upcomingResults] = await db.promise().query(upcomingQuery, params);
            console.log(`%c[ClientModel DEBUG] Resultado da query para próximas citas (antes do map):`, 'color: blue;', upcomingResults);
            return upcomingResults.map(item => ({
                ...item,
                mes_abrev: item.mes_abrev ? item.mes_abrev.toUpperCase().replace('.', '') : '???'
            }));
        } catch (error) {
            console.error(`%c[ClientModel DEBUG] Erro em getUpcomingAppointments para cliente ${clientId}:`, 'color: red; font-weight: bold;', error);
            return [];
        }
    }
    static async updateClient(id, clientData) {
        const fieldsToUpdate = [];
        const params = [];
        const allowedFields = {
            nome_completo: 'nome_completo',
            email: 'email',
            telefone: 'telefone',
            data_nascimento: 'data_nascimento',
            endereco: 'endereco',
            cidade: 'cidade',
            documento_identidade: 'documento_identidade',
            profissao: 'profissao',
            observacoes: 'observacoes',
            foto_perfil: 'foto_perfil'
        };

        for (const key in clientData) {
            if (allowedFields[key] && clientData[key] !== undefined) {
                fieldsToUpdate.push(`${allowedFields[key]} = ?`);
                params.push((key === 'data_nascimento' && clientData[key] === '') ? null : clientData[key]);
            }
        }

        if (fieldsToUpdate.length === 0) {
            console.warn(`[Model updateClient] Nenhuma alteração detectada para cliente ID ${id}.`);
            return false;
        }
        params.push(id);

        const query = `UPDATE clientes SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

        try {
            const formattedQuery = db.format(query, params);
            console.log(`[Model updateClient] Query para ID ${id}:`, formattedQuery);
            const [result] = await db.promise().query(query, params);
            console.log(`[Model updateClient] Resultado para ID ${id}:`, result);

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`[Model Error] Erro ao atualizar cliente ID ${id}:`, error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Erro: Email ou documento já pertence a outro cliente.');
            }
            
            throw new Error(error.message || 'Erro interno ao atualizar cliente.');
        }
    }
    static async deleteClient(id) {
        let connection; try {
            connection = await db.promise().getConnection(); await connection.beginTransaction(); const [clientResult] = await connection.query('SELECT foto_perfil FROM clientes WHERE id = ? FOR UPDATE', [id]); const client = clientResult[0]; if (!client) { console.warn(`[Model deleteClient] Cliente ID ${id} não encontrado.`); await connection.rollback(); connection.release(); return false; }
            const [deleteResult] = await connection.query('DELETE FROM clientes WHERE id = ?', [id]); if (deleteResult.affectedRows === 0) { console.warn(`[Model deleteClient] Falha ao deletar cliente ID ${id}. Rollback.`); await connection.rollback(); connection.release(); return false; } if (client.foto_perfil) { const photoPath = path.join(__dirname, '..', '..', client.foto_perfil); console.log(`[Model deleteClient] Tentando deletar foto em: ${photoPath}`); try { if (fs.existsSync(photoPath)) { fs.unlinkSync(photoPath); console.log(`[Model deleteClient] Foto deletada: ${photoPath}`); } else { console.warn(`[Model deleteClient] Foto ${photoPath} não encontrada.`); } } catch (unlinkError) { console.error(`[Model deleteClient Error] Erro ao deletar foto ${photoPath}:`, unlinkError); } } await connection.commit(); console.log(`[Model Success] Cliente ID ${id} deletado.`); connection.release(); return true;
        }
        catch (error) { console.error(`[Model Error] Erro ao deletar cliente ID ${id}:`, error); if (connection) { try { await connection.rollback(); } catch (rbError) { console.error("Erro no rollback:", rbError); } connection.release(); } throw new Error(error.message || 'Erro interno ao deletar cliente.'); }
    }

    static async countNewClientsByDateRange(startDate, endDate) {
        console.log(`[Model] countNewClients - Contando entre ${startDate} e ${endDate}`);
        try { const query = ` SELECT COUNT(*) as count FROM clientes WHERE DATE(data_cadastro) BETWEEN ? AND ?; `; const params = [startDate, endDate]; const [results] = await db.promise().query(query, params); const count = parseInt(results[0]?.count, 10) || 0; console.log(`[Model] countNewClients encontrou ${count} novos clientes.`); return count; }
        catch (error) { console.error(`[Model] Erro em countNewClients (${startDate} a ${endDate}):`, error); throw new Error('Erro ao contar novos clientes no banco de dados.'); }
    }

} 