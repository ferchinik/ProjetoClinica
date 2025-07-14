// clinica/public/js/forms/prontuarios.js
import { navigateTo } from '../navigation.js'; // CORRIGIDO: ../ para subir um nível
import { showNotification } from '../notification.js'; // CORRIGIDO: ../ para subir um nível

// Função para formatar data (dd/mm/aaaa - Fuso Local)
function formatLocalDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data Inválida';
        // Adicionado timeZone UTC para consistência, ajuste se precisar do fuso local do servidor/cliente
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
        });
    } catch (e) {
        console.warn("[Prontuarios] Erro formatando data:", dateString, e);
        const match = String(dateString).match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : 'Inválida';
    }
}

// Função para formatar hora (HH:MM - Fuso Local)
function formatLocalTime(dateString) {
    if (!dateString) return '--:--';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Inválida';
        // Adicionado timeZone UTC para consistência
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
        });
    } catch (e) {
        console.warn("[Prontuarios] Erro formatando hora:", dateString, e);
        return 'Inválida';
    }
}

// Função para carregar os agendamentos recentes
async function loadRecentAppointments() {
    const tableBody = document.getElementById('appointments-table-body');
    if (!tableBody) {
        console.error("[Prontuarios.js] Erro Crítico: Tabela #appointments-table-body não encontrada.");
        return;
    }
    tableBody.innerHTML = `<tr><td colspan="7" class="loading-message" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando agendamentos recentes...</td></tr>`;

    try {
        console.log("[Prontuarios.js] Buscando agendamentos recentes em /api/agendamentos");
        const response = await fetch('/api/agendamentos', { credentials: 'include' });
        console.log("[Prontuarios.js] Resposta da API recebida, Status:", response.status);

        if (!response.ok) {
            let errorMsg = `Erro HTTP ${response.status}`;
            try { errorMsg = (await response.json()).message || errorMsg; } catch(e) {}
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log("[Prontuarios.js] Dados recebidos:", result);

        if (!result.success || !Array.isArray(result.appointments)) {
            throw new Error(result.message || 'Resposta da API inválida ao buscar agendamentos recentes.');
        }

        const appointments = result.appointments;
        tableBody.innerHTML = ''; // Limpa o tbody

        if (appointments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="loading-message" style="text-align: center; padding: 20px;">Não há agendamentos recentes registrados.</td></tr>`;
            console.log("[Prontuarios.js] Nenhum agendamento recente encontrado.");
            return;
        }

        appointments.forEach((appointment, index) => {
            if (!appointment || typeof appointment !== 'object' || !appointment.id) {
                console.warn(`[Prontuarios.js] Ignorando agendamento inválido no índice ${index}:`, appointment);
                return;
            }

            const row = tableBody.insertRow();
            row.dataset.appointmentId = appointment.id;

            row.insertCell().textContent = formatLocalDate(appointment.data_hora_iso);
            row.insertCell().textContent = formatLocalTime(appointment.data_hora_iso);
            row.insertCell().textContent = appointment.paciente_nome || 'N/A';
            row.insertCell().textContent = appointment.tipo_consulta || 'N/A';
            row.insertCell().textContent = appointment.profissional_nome || 'N/D';

            const statusCell = row.insertCell();
            statusCell.textContent = appointment.status || '?';
            let statusClass = (appointment.status || '').toLowerCase().replace(/\s+/g, '-');
            statusCell.className = `status-${statusClass}`;

            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <button class="btn-icon btn-sm view-appointment-btn" data-id="${appointment.id}" title="Ver Detalhes (não implementado)">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon btn-sm edit-appointment-btn" data-id="${appointment.id}" title="Editar Agendamento">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-sm delete-appointment-btn" data-id="${appointment.id}" title="Excluir Agendamento">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        });
        console.log(`[Prontuarios.js] ${appointments.length} agendamentos recentes renderizados.`);

    } catch (error) {
        console.error('[Prontuarios.js] Erro ao carregar agendamentos recentes:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="error-message" style="text-align: center; padding: 20px; color: var(--danger-color);">Erro ao carregar os agendamentos: ${error.message}</td></tr>`;
        if(typeof showNotification === 'function') showNotification(`Erro ao carregar agendamentos: ${error.message}`, 'error');
    }
}

function viewAppointment(id) {
    console.log('[Prontuarios.js] Ver agendamento (placeholder):', id);
    alert(`Visualizar agendamento ${id} (funcionalidade não implementada nesta tela)`);
}

function editAppointment(id) {
    console.log('[Prontuarios.js] Editar agendamento:', id);
    if (typeof navigateTo === 'function') {
        sessionStorage.setItem('editingAppointmentId', id);
        navigateTo('editar-cita');
    } else {
        console.error('[Prontuarios.js] Erro: Função navigateTo não definida ou importada.');
        alert('Erro interno: Não foi possível navegar para a edição.');
    }
}

async function deleteAppointmentPrompt(id) {
    if (confirm(`Tem certeza que deseja eliminar o agendamento ID ${id}?`)) {
        console.log('[Prontuarios.js] Excluir agendamento:', id);
        try {
            if(typeof showNotification === 'function') showNotification('Excluindo...', 'info');
            else console.log('Excluindo...');

            const response = await fetch(`/api/agendamentos/${id}`, { method: 'DELETE', credentials: 'include' });
            const result = await response.json().catch(()=>({success:false, message:'Resposta inválida do servidor.'}));

            if (!response.ok || !result.success) {
                throw new Error(result.message || `Erro ${response.status}`);
            }

            if(typeof showNotification === 'function') showNotification('Agendamento eliminado com sucesso!', 'success');
            else alert('Agendamento eliminado com sucesso!');

            const rowToRemove = document.querySelector(`#appointments-table-body tr[data-appointment-id="${id}"]`);
            if (rowToRemove) {
                rowToRemove.style.opacity = '0';
                rowToRemove.style.transition = 'opacity 0.3s ease';
                setTimeout(() => rowToRemove.remove(), 300);
            } else {
                loadRecentAppointments(); // Recarrega se não achar a linha
            }
        } catch(error) {
             console.error("[Prontuarios.js] Erro ao excluir:", error);
             if(typeof showNotification === 'function') showNotification(`Erro ao excluir: ${error.message}`, 'error');
             else alert(`Erro ao excluir: ${error.message}`);
        }
    }
}

function setupTableActionListeners() {
    const tableBody = document.getElementById('appointments-table-body');
    if (!tableBody) {
         console.error("[Prontuarios.js] Listener não adicionado: Tabela não encontrada.");
         return;
    }
    // Evita adicionar listeners duplicados
    if (tableBody.dataset.listenerAttached === 'true') {
        console.log("[Prontuarios.js] Listener de delegação já configurado.");
        return;
    }

    tableBody.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-id]');
        if (!button) return;
        const appointmentId = button.dataset.id;

        if (button.classList.contains('view-appointment-btn')) viewAppointment(appointmentId);
        else if (button.classList.contains('edit-appointment-btn')) editAppointment(appointmentId);
        else if (button.classList.contains('delete-appointment-btn')) deleteAppointmentPrompt(appointmentId);
    });
    tableBody.dataset.listenerAttached = 'true';
    console.log("[Prontuarios.js] Listener de delegação configurado.");
}

export function initProntuarios() {
    console.log("[Prontuarios.js] initProntuarios() chamada.");
    const tableBody = document.getElementById('appointments-table-body');
    if (!tableBody) {
        console.warn("[Prontuarios.js] Tabela #appointments-table-body não encontrada no DOM durante init. Será tentado novamente após 'componentLoaded' pelo app.js.");
        return;
    }
    // Se já inicializado, apenas recarrega os dados para evitar re-adicionar listeners.
    if (tableBody.dataset.prontuariosInitialized === 'true') {
        console.log("[Prontuarios.js] Já inicializado. Recarregando dados dos agendamentos.");
        loadRecentAppointments();
        return;
    }

    console.log("[Prontuarios.js] Executando inicialização completa para Prontuários...");
    loadRecentAppointments();
    setupTableActionListeners(); // Configura os listeners de ação na tabela
    tableBody.dataset.prontuariosInitialized = 'true'; // Marca como inicializado
    console.log("[Prontuarios.js] Inicialização de Prontuários concluída.");
}
