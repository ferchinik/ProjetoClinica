import { db } from '../config/db.js';

export default class AgendamentoModel {

    static createAgendamento(agendamentoData) {
        console.log("--> [MODEL] AgendamentoModel.createAgendamento INICIADO");
        console.log("--> [MODEL] agendamentoData recebido (com cliente_id):", JSON.stringify(agendamentoData, null, 2));

        return new Promise(async (resolve, reject) => {
            const {
                cliente_id, 
                paciente_nome, data_hora, tipo_consulta, profissional_id,
                observacoes = null, status = 'Pendente', valor
            } = agendamentoData;

            if (!paciente_nome || !data_hora || !tipo_consulta || !profissional_id) {
                console.error("--> [MODEL] Erro: Validação falhou (campos obrigatórios).");
                return reject(new Error('Nome do paciente, data/hora, tipo da consulta e profissional são obrigatórios.'));
            }

            const valorFinalModel = (valor !== undefined && valor !== null) ? parseFloat(valor) : null;
            if (valor !== null && (isNaN(valorFinalModel) || valorFinalModel < 0)) {
                 console.error("--> [MODEL] Erro: Valor da consulta inválido recebido.");
                 return reject(new Error('Valor da consulta inválido.'));
            }

            try {
                const checkQuery = `SELECT COUNT(*) as count FROM agendamentos WHERE data_hora = ? AND (paciente_nome = ? OR profissional_id = ?) AND status <> 'Cancelado'`;
                const [checkResult] = await db.promise().query(checkQuery, [data_hora, paciente_nome, profissional_id]);
                if (checkResult[0].count > 0) {
                    const checkDetailQuery = `SELECT paciente_nome FROM agendamentos WHERE data_hora = ? AND profissional_id = ? AND status <> 'Cancelado'`;
                    const [detailResult] = await db.promise().query(checkDetailQuery, [data_hora, profissional_id]);
                    if (detailResult.length > 0 && detailResult[0].paciente_nome === paciente_nome) { throw new Error('Este paciente já possui um agendamento neste horário.'); }
                    else if (detailResult.length > 0) { throw new Error('Este profissional já possui um agendamento neste horário.'); }
                    else { throw new Error('Conflito de horário detectado para este paciente.'); }
                }

                const finalProfissionalId = profissional_id ? parseInt(profissional_id, 10) : null;
                if (profissional_id && isNaN(finalProfissionalId)) { return reject(new Error('ID do profissional inválido.')); }

                const query = `
                    INSERT INTO agendamentos (
                        cliente_id, paciente_nome, data_hora, tipo_consulta, profissional_id, status, observacoes, valor
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const params = [
                    cliente_id, 
                    paciente_nome, data_hora, tipo_consulta, finalProfissionalId, status, observacoes, valorFinalModel
                ];

                console.log("--> [MODEL] Executando SQL:", db.format(query, params));
                const [result] = await db.promise().query(query, params);
                if (result.insertId) { resolve(result.insertId); }
                else { reject(new Error('Não foi possível criar o agendamento.')); }
            } catch (error) {
                 console.error("--> [MODEL] ERRO CAPTURADO no DB Query:", error.message, error.code);
                 if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_agendamento_profissional')) { 
                     return reject(new Error(`Profissional com ID ${finalProfissionalId} não encontrado.`));
                 }
                 if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_agendamento_cliente')) { 
                     return reject(new Error(`Cliente com ID ${cliente_id} não encontrado.`));
                 }
                 if (error.message.includes('possui um agendamento neste horário')) { return reject(error); }
                 if (error.code === 'ER_BAD_NULL_ERROR' && error.message.includes("'valor'")) { return reject(new Error("O valor da consulta é obrigatório.")); }
                 if (error.code === 'ER_TRUNCATED_WRONG_VALUE' && error.message.includes("'valor'")) { return reject(new Error("Formato inválido para o valor da consulta.")); }
                 reject(new Error(error.message || 'Erro interno ao salvar agendamento.'));
            }
        });
    }

    static async listAgendamentos(date = null) {
        console.log(`[Model] listAgendamentos - Buscando para data: ${date || 'Recentes'}`);
        try {
            let query = `
                SELECT a.id, a.paciente_nome, a.data_hora, a.tipo_consulta, a.status,
                       a.observacoes, a.profissional_id, a.valor, a.cliente_id,
                       c.foto_perfil, c.email as cliente_email, c.telefone as cliente_telefone,
                       r.nombre as profissional_nome
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id 
                LEFT JOIN registro r ON a.profissional_id = r.id
            `;
            const params = [];
            if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                query += ' WHERE DATE(a.data_hora) = ? ORDER BY a.data_hora ASC ';
                params.push(date);
            } else {
                query += ' ORDER BY a.data_hora DESC, a.cliente_id LIMIT 50 ';
            }
            const [agendamentos] = await db.promise().query(query, params);
            return agendamentos;
        } catch (error) {
            console.error(`[Model] Erro em listAgendamentos (${date || 'Recentes'}):`, error);
            throw new Error('Erro ao buscar agendamentos no banco de dados.');
        }
    }

    static async listAgendamentosByMonth(year, month) {
        console.log(`[Model] Buscando agendamentos para ${year}-${String(month).padStart(2,'0')}`);
        try {
            const query = `
                SELECT
                    a.id, a.paciente_nome, a.data_hora, a.tipo_consulta, a.status,
                    a.profissional_id, a.valor, a.cliente_id,
                    r.nombre as profissional_nome
                FROM agendamentos a
                LEFT JOIN registro r ON a.profissional_id = r.id
                WHERE YEAR(a.data_hora) = ? AND MONTH(a.data_hora) = ?
                ORDER BY a.data_hora ASC
            `;
            const params = [year, month];
            const [results] = await db.promise().query(query, params);
            const groupedAppointments = {};
            results.forEach(ag => {
                if (!ag.data_hora) return;
                const localDate = new Date(ag.data_hora);
                const dateString = localDate.toISOString().split('T')[0];
                if (!groupedAppointments[dateString]) groupedAppointments[dateString] = [];
                groupedAppointments[dateString].push({
                    id: ag.id,
                    cliente_id: ag.cliente_id,
                    paciente_nome: ag.paciente_nome || '?',
                    hora: localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    tipo_consulta: ag.tipo_consulta || '?',
                    status: ag.status || '?',
                    profissional_nome: ag.profissional_nome || 'N/D',
                    valor: ag.valor
                });
            });
            return groupedAppointments;
        } catch (error) {
            console.error(`[Model] Erro ao listar agendamentos por mês (${year}-${month}):`, error);
            throw new Error('Erro ao buscar agendamentos do mês no banco de dados.');
        }
    }

    static async deleteAgendamento(id) {
        console.log(`[Model] Tentando excluir agendamento ID: ${id}`);
        try {
            const query = 'DELETE FROM agendamentos WHERE id = ?';
            const [result] = await db.promise().query(query, [id]);
            if (result.affectedRows === 0) throw new Error('Agendamento não encontrado');
            return true;
        } catch (error) {
            console.error(`[Model] Erro ao excluir agendamento ${id}:`, error);
            throw error;
        }
    }

     static async getAgendamentoById(id) {
        console.log(`[Model] Buscando agendamento por ID: ${id}`);
        try {
            const query = `
                SELECT
                    a.id, a.paciente_nome, a.data_hora, a.tipo_consulta,
                    a.status, a.profissional_id, a.observacoes, a.valor,
                    a.cliente_id,
                    r.nombre as profissional_nome
                FROM agendamentos a
                LEFT JOIN registro r ON a.profissional_id = r.id
                WHERE a.id = ?
            `;
            const [results] = await db.promise().query(query, [id]);
            return results[0] || null;
        } catch (error) {
            console.error(`[Model] Erro ao buscar agendamento por ID ${id}:`, error);
            throw new Error('Erro ao buscar agendamento no banco de dados.');
        }
    }

    static async updateAgendamento(id, agendamentoData) {
        console.log(`[Model] Atualizando agendamento ID: ${id}`, agendamentoData);
        const {
            cliente_id,
            paciente_nome, data_hora, tipo_consulta, profissional_id,
            status, observacoes = null, valor
        } = agendamentoData;

        if (!paciente_nome || !data_hora || !tipo_consulta || !profissional_id || !status) {
            throw new Error('Nome do paciente, data/hora, tipo, profissional e status são obrigatórios para atualizar.');
        }
        const valorFinalModelUpdate = (valor !== undefined && valor !== null) ? parseFloat(valor) : null;
        if (valor !== null && (isNaN(valorFinalModelUpdate) || valorFinalModelUpdate < 0)) {
             throw new Error('Valor da consulta inválido.');
        }

        try {
            const checkQuery = `SELECT COUNT(*) as count FROM agendamentos WHERE data_hora = ? AND (paciente_nome = ? OR profissional_id = ?) AND status <> 'Cancelado' AND id <> ?`;
            const [checkResult] = await db.promise().query(checkQuery, [data_hora, paciente_nome, profissional_id, id]);
            if (checkResult[0].count > 0) {
                 const conflictDetailQuery = `SELECT id, paciente_nome, profissional_id FROM agendamentos WHERE data_hora = ? AND (paciente_nome = ? OR profissional_id = ?) AND status <> 'Cancelado' AND id <> ? LIMIT 1`;
                 const [conflictDetails] = await db.promise().query(conflictDetailQuery, [data_hora, paciente_nome, profissional_id, id]);
                 if (conflictDetails.length > 0) {
                     if (String(conflictDetails[0].profissional_id) === String(profissional_id)) { throw new Error('Este profissional já possui outro agendamento neste horário.'); }
                     else if (conflictDetails[0].paciente_nome === paciente_nome) { throw new Error('Este paciente já possui outro agendamento neste horário.'); }
                     else { throw new Error('Conflito de horário detectado.'); }
                 } else { throw new Error('Conflito de horário detectado.'); }
            }

            const finalProfissionalId = profissional_id ? parseInt(profissional_id, 10) : null;
            if (profissional_id && isNaN(finalProfissionalId)) { throw new Error('ID do profissional inválido.'); }

            const query = `
                UPDATE agendamentos
                SET cliente_id = ?, paciente_nome = ?, data_hora = ?, tipo_consulta = ?, profissional_id = ?,
                    status = ?, observacoes = ?, valor = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            const params = [
                cliente_id, 
                paciente_nome, data_hora, tipo_consulta, finalProfissionalId, status, observacoes,
                valorFinalModelUpdate, id
            ];

            console.log("[Model] Executando UPDATE SQL:", db.format(query, params));
            const [result] = await db.promise().query(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`[Model] Erro ao atualizar agendamento ID ${id}:`, error);
             if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_agendamento_profissional')) { 
                 throw new Error(`Profissional com ID ${finalProfissionalId} não encontrado.`);
             }
             if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_agendamento_cliente')) { 
                 throw new Error(`Cliente com ID ${cliente_id} não encontrado.`);
             }
             if (error.message.includes('outro agendamento neste horário')) { throw error; }
             if (error.code === 'ER_BAD_NULL_ERROR' && error.message.includes("'valor'")) { throw new Error("O valor da consulta é obrigatório."); }
             if (error.code === 'ER_TRUNCATED_WRONG_VALUE' && error.message.includes("'valor'")) { throw new Error("Formato inválido para o valor da consulta."); }
             throw new Error(error.message || 'Erro interno ao atualizar agendamento.');
        }
    }

    static async listAgendamentosByDateRange(startDate, endDate, limit = 100) {
        console.log(`[Model] listAgendamentosByDateRange - Buscando entre ${startDate} e ${endDate}`);
        try {
            const query = `
                SELECT a.id, a.paciente_nome, a.data_hora, a.tipo_consulta, a.status,
                       a.observacoes, a.profissional_id, a.valor, a.cliente_id,
                       c.foto_perfil, c.email as cliente_email, c.telefone as cliente_telefone,
                       r.nombre as profissional_nome
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                LEFT JOIN registro r ON a.profissional_id = r.id
                WHERE DATE(a.data_hora) BETWEEN ? AND ?
                ORDER BY a.data_hora ASC
                LIMIT ?
            `;
            const params = [startDate, endDate, limit];
            const [agendamentos] = await db.promise().query(query, params);
            console.log(`[Model] listAgendamentosByDateRange encontrou ${agendamentos.length} agendamentos.`);
            return agendamentos;
        } catch (error) {
            console.error(`[Model] Erro em listAgendamentosByDateRange (${startDate} a ${endDate}):`, error);
            throw new Error('Erro ao buscar agendamentos por intervalo no banco de dados.');
        }
    }

    static async getProcedureCountsByDateRange(startDate, endDate, limit = 10) {
        console.log(`[Model] getProcedureCounts - Buscando entre ${startDate} e ${endDate}`);
        try {
            const query = `
                SELECT
                    tipo_consulta as procedimento,
                    COUNT(*) as quantidade
                FROM agendamentos
                WHERE status = 'Realizado'
                  AND DATE(data_hora) BETWEEN ? AND ?
                GROUP BY tipo_consulta
                HAVING COUNT(*) > 0 AND procedimento IS NOT NULL AND procedimento <> ''
                ORDER BY quantidade DESC
                LIMIT ?;
            `;
            const params = [startDate, endDate, limit];
            const [results] = await db.promise().query(query, params);
            console.log(`[Model] getProcedureCounts encontrou ${results.length} tipos de procedimentos realizados.`);
            return results.map(row => ({
                procedimento: row.procedimento,
                quantidade: parseInt(row.quantidade, 10) || 0
            }));
        } catch (error) {
            console.error(`[Model] Erro em getProcedureCounts (${startDate} a ${endDate}):`, error);
            throw new Error('Erro ao buscar contagem de procedimentos no banco de dados.');
        }
    }

    static async countAppointmentsByDateRange(startDate, endDate) {
        console.log(`[Model] countAppointments - Contando entre ${startDate} e ${endDate} (não cancelados)`);
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM agendamentos
                WHERE DATE(data_hora) BETWEEN ? AND ?
                  AND status <> 'Cancelado';
            `;
            const params = [startDate, endDate];
            const [results] = await db.promise().query(query, params);
            const count = parseInt(results[0]?.count, 10) || 0;
            console.log(`[Model] countAppointments encontrou ${count} agendamentos.`);
            return count;
        } catch (error) {
            console.error(`[Model] Erro em countAppointments (${startDate} a ${endDate}):`, error);
            throw new Error('Erro ao contar agendamentos no banco de dados.');
        }
    }
}