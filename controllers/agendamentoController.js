import AgendamentoModel from '../models/agendamentoModel.js';
import { db } from '../config/db.js';

async function findClientIdByName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return null;
    }
    try {
        const query = 'SELECT id FROM clientes WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM(?)) LIMIT 1';
        const [results] = await db.promise().query(query, [name.trim()]);
        if (results.length > 0) {
            console.log(`[Controller] Cliente ID ${results[0].id} encontrado para nome "${name}"`);
            return results[0].id;
        } else {
            console.log(`[Controller] Nenhum cliente encontrado para nome "${name}"`);
            return null;
        }
    } catch (error) {
        console.error(`[Controller] Erro ao buscar cliente por nome "${name}":`, error);
        throw new Error('Erro ao verificar cliente existente.');
    }
}


export default class AgendamentoController {

    static async create(req, res) {
        console.log("Controller: Recebido POST /api/agendamentos", req.body);
        try {
            const {
                pacienteName, appointmentDate, appointmentTime, appointmentType,
                professional, observacoes, appointmentValue
            } = req.body;

            if (!pacienteName || !appointmentDate || !appointmentTime || !appointmentType || !professional) {
                 return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando (paciente, data, hora, tipo, profissional).' });
             }

            let valorFinal = null;
            if (appointmentValue !== undefined && appointmentValue !== null && String(appointmentValue).trim() !== '') {
                 valorFinal = parseFloat(String(appointmentValue).replace(',', '.'));
                 if (isNaN(valorFinal) || valorFinal < 0) {
                     return res.status(400).json({ success: false, message: 'Valor da consulta inválido. Deve ser um número positivo.' });
                 }
                 valorFinal = parseFloat(valorFinal.toFixed(2));
            }

            const clienteId = await findClientIdByName(pacienteName);

            const data_hora_combinada = `${appointmentDate} ${appointmentTime}:00`;
            const agendamentoData = {
                cliente_id: clienteId,
                paciente_nome: pacienteName.trim(), data_hora: data_hora_combinada,
                tipo_consulta: appointmentType.trim(), profissional_id: professional,
                observacoes: observacoes ? observacoes.trim() : null, status: 'Pendente', valor: valorFinal
            };

            console.log("Controller: Dados preparados para o Model (com valor e cliente_id):", agendamentoData);
            const newAgendamentoId = await AgendamentoModel.createAgendamento(agendamentoData);
            res.status(201).json({ success: true, message: 'Agendamento criado com sucesso!', agendamentoId: newAgendamentoId });

        } catch (error) {
            console.error("Erro no Controller [create agendamento]:", error);
            let statusCode = 500;
            if (error.message.includes('obrigatórios') || error.message.includes('inválido') || error.message.includes('Valor da consulta inválido') || error.message.includes('não encontrado')) {
                 statusCode = 400;
            } else if (error.message.includes('possui um agendamento neste horário')) {
                 statusCode = 409;
            }
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno no servidor ao criar agendamento.' });
        }
    }

    static async list(req, res) {
        try {
            const dateParam = req.query.date;
            let dateFilter = null;
            if (dateParam) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
                    return res.status(400).json({ success: false, message: 'Parâmetro de data inválido (formato YYYY-MM-DD).' });
                }
                dateFilter = dateParam;
                console.log(`[Controller] Recebido GET /agendamentos?date=${dateFilter}`);
            } else { console.log(`[Controller] Recebido GET /agendamentos (listando recentes)`); }

            const agendamentos = await AgendamentoModel.listAgendamentos(dateFilter);
            res.status(200).json({
                success: true, date: dateFilter,
                appointments: agendamentos.map(ag => {
                    let data_formatada = 'Inválida'; let hora_formatada = 'HH:MM'; let data_hora_iso = null;
                    if (ag.data_hora) {
                        try { const dt = new Date(ag.data_hora); data_formatada = dt.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); hora_formatada = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); data_hora_iso = dt.toISOString(); }
                        catch (e) { console.warn("Erro ao formatar data/hora:", ag.data_hora, e); }
                    }
                    return { id: ag.id, paciente_nome: ag.paciente_nome || '?', data_hora_iso: data_hora_iso, data_formatada: data_formatada, hora_formatada: hora_formatada, tipo_consulta: ag.tipo_consulta || '?', status: ag.status || '?', profissional_id: ag.profissional_id, profissional_nome: ag.profissional_nome || 'N/D', observacoes: ag.observacoes, foto_perfil: ag.foto_perfil, cliente_email: ag.cliente_email, cliente_telefone: ag.cliente_telefone, valor: ag.valor, cliente_id: ag.cliente_id };
                })
            });
        } catch (error) {
            console.error('[Controller] Erro ao listar agendamentos:', error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar agendamentos.' });
        }
    }

     static async listByMonth(req, res) {
        try {
            const year = parseInt(req.query.year, 10);
            const month = parseInt(req.query.month, 10);
            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                return res.status(400).json({ success: false, message: 'Ano e mês (1-12) são obrigatórios e devem ser números válidos.' });
            }
            console.log(`[Controller] Recebido GET /agendamentos/month - Ano: ${year}, Mês: ${month}`);
            const monthlyData = await AgendamentoModel.listAgendamentosByMonth(year, month);
            res.status(200).json({ success: true, appointmentsByDate: monthlyData });
        } catch (error) {
            console.error('[Controller] Erro em listByMonth:', error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar agendamentos do mês.' });
        }
    }

    static async delete(req, res) {
        const agendamentoId = req.params.id;
        try {
            const id = parseInt(agendamentoId);
            if (isNaN(id) || id <= 0) { return res.status(400).json({ success: false, message: 'ID de agendamento inválido.' }); }
            console.log(`[Controller] Recebido DELETE /agendamentos/${id}`);
            await AgendamentoModel.deleteAgendamento(id);
            res.status(200).json({ success: true, message: 'Agendamento excluído com sucesso!' });
        } catch (error) {
            console.error(`[Controller] Erro ao excluir agendamento ${agendamentoId}:`, error);
            if (error.message === 'Agendamento não encontrado') { return res.status(404).json({ success: false, message: error.message }); }
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao excluir agendamento.' });
        }
    }

     static async getById(req, res) {
        const agendamentoId = req.params.id;
        console.log(`[Controller] Recebido GET /api/agendamentos/${agendamentoId}`);
        try {
            const id = parseInt(agendamentoId);
            if (isNaN(id) || id <= 0) { return res.status(400).json({ success: false, message: 'ID de agendamento inválido.' }); }
            const agendamento = await AgendamentoModel.getAgendamentoById(id);
            if (agendamento) { res.status(200).json({ success: true, agendamento: agendamento }); }
            else { res.status(404).json({ success: false, message: 'Agendamento não encontrado.' }); }
        } catch (error) {
            console.error(`[Controller] Erro em getById (${agendamentoId}):`, error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar agendamento.' });
        }
    }


    static async update(req, res) {
        const agendamentoId = req.params.id;
        const updateData = req.body;
        console.log(`[Controller] Recebido PUT /api/agendamentos/${agendamentoId}`, updateData);
        try {
            const id = parseInt(agendamentoId);
            if (isNaN(id) || id <= 0) { return res.status(400).json({ success: false, message: 'ID de agendamento inválido.' }); }
            const { pacienteName, appointmentDate, appointmentTime, appointmentType, professional, status, observacoes, appointmentValue } = updateData;

            if (!pacienteName || !appointmentDate || !appointmentTime || !appointmentType || !professional || !status) { return res.status(400).json({ success: false, message: 'Controller: Campos obrigatórios faltando para atualização.' }); }
            const validStatus = ['Pendente', 'Confirmado', 'Cancelado', 'Realizado', 'No Show'];
            if (!validStatus.includes(status)) { return res.status(400).json({ success: false, message: 'Controller: Status inválido.' }); }

            let valorFinalUpdate = null;
            if (appointmentValue !== undefined && appointmentValue !== null && String(appointmentValue).trim() !== '') {
                valorFinalUpdate = parseFloat(String(appointmentValue).replace(',', '.'));
                if (isNaN(valorFinalUpdate) || valorFinalUpdate < 0) { return res.status(400).json({ success: false, message: 'Valor da consulta inválido. Deve ser um número positivo.' }); }
                valorFinalUpdate = parseFloat(valorFinalUpdate.toFixed(2));
            }

            const clienteId = await findClientIdByName(pacienteName);

            const data_hora_combinada = `${appointmentDate} ${appointmentTime}:00`;
            const modelData = {
                 cliente_id: clienteId,
                paciente_nome: pacienteName.trim(), data_hora: data_hora_combinada, tipo_consulta: appointmentType.trim(),
                profissional_id: professional, status: status, observacoes: observacoes ? observacoes.trim() : null, valor: valorFinalUpdate
            };

            console.log("[Controller] Dados formatados para Model.updateAgendamento (com valor e cliente_id):", modelData);
            const updated = await AgendamentoModel.updateAgendamento(id, modelData);

            if (updated) { res.status(200).json({ success: true, message: 'Agendamento atualizado com sucesso!' }); }
            else { res.status(404).json({ success: false, message: 'Agendamento não encontrado para atualizar.' }); }
        } catch (error) {
            console.error(`[Controller] Erro em update (${agendamentoId}):`, error);
            let statusCode = 500;
             if (error.message.includes('obrigatórios') || error.message.includes('inválido') || error.message.includes('Valor da consulta inválido') || error.message.includes('não encontrado')) {
                statusCode = 400;
             } else if (error.message.includes('outro agendamento neste horário')) {
                statusCode = 409;
             }
            res.status(statusCode).json({ success: false, message: error.message || 'Erro interno no servidor ao atualizar agendamento.' });
        }
    }

    static async listByDateRange(req, res) {
        const { startDate, endDate } = req.query;
        console.log(`[Controller] Recebido GET /agendamentos/by-range - Start: ${startDate}, End: ${endDate}`);

        if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ success: false, message: 'Datas de início e fim (formato YYYY-MM-DD) são obrigatórias.' });
        }
        if (new Date(startDate) > new Date(endDate)) {
             return res.status(400).json({ success: false, message: 'Data de início não pode ser posterior à data de fim.' });
        }

        try {
            const agendamentos = await AgendamentoModel.listAgendamentosByDateRange(startDate, endDate);
            res.status(200).json({
                success: true, filter: { startDate, endDate },
                appointments: agendamentos.map(ag => {
                    let data_formatada = 'Inválida'; let hora_formatada = 'HH:MM'; let data_hora_iso = null;
                    if (ag.data_hora) {
                        try { const dt = new Date(ag.data_hora); data_formatada = dt.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }); hora_formatada = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); data_hora_iso = dt.toISOString(); }
                        catch (e) { console.warn("Erro ao formatar data/hora:", ag.data_hora, e); }
                    }
                    return { id: ag.id, paciente_nome: ag.paciente_nome || '?', data_hora_iso: data_hora_iso, data_formatada: data_formatada, hora_formatada: hora_formatada, tipo_consulta: ag.tipo_consulta || '?', profissional_nome: ag.profissional_nome || 'N/D', valor: ag.valor, cliente_id: ag.cliente_id };
                })
            });
        } catch (error) {
            console.error('[Controller] Erro ao listar agendamentos por range:', error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao buscar agendamentos por intervalo.' });
        }
    }

    static async getProcedureCountsReport(req, res) {
        const { startDate, endDate } = req.query;
        console.log(`[Controller] Recebido GET /agendamentos/reports/procedure-counts - Start: ${startDate}, End: ${endDate}`);

        if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ success: false, message: 'Datas de início e fim (YYYY-MM-DD) são obrigatórias.' });
        }
        if (new Date(startDate) > new Date(endDate)) {
             return res.status(400).json({ success: false, message: 'Data de início não pode ser posterior à data de fim.' });
        }

        try {
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const procedureCounts = await AgendamentoModel.getProcedureCountsByDateRange(startDate, endDate, limit);
            res.status(200).json({ success: true, reportParams: { startDate, endDate, limit }, procedureCounts: procedureCounts });
        } catch (error) {
            console.error('[Controller] Erro ao gerar relatório de contagem de procedimentos:', error);
            res.status(500).json({ success: false, message: error.message || 'Erro interno ao gerar relatório de procedimentos.' });
        }
    }

}