import { showNotification } from '../notification.js';
import { navigateTo } from '../navigation.js';

// Função principal que será chamada para inicializar a página
export function initDiaAgendamentos() {
    const dataSelecionada = sessionStorage.getItem('dataSelecionada');
    if (!dataSelecionada) {
        showNotification('Nenhuma data selecionada.', 'error');
        navigateTo('agendamento');
        return;
    }

    const tituloEl = document.getElementById('data-selecionada-titulo');
    if (tituloEl) {
        // Formata a data para exibição no título
        const [ano, mes, dia] = dataSelecionada.split('-');
        tituloEl.textContent = `${dia}/${mes}/${ano}`;
    }

    loadAppointmentsForDay(dataSelecionada);
}

// Busca os agendamentos da API
async function loadAppointmentsForDay(dateString) {
    const tableBody = document.getElementById('dia-appointments-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="7">Cargando citas...</td></tr>`;

    try {
        // A sua API já suporta a busca por data
        const response = await fetch(`/api/agendamentos?date=${dateString}`, { credentials: 'include' });
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        renderAppointmentsTable(data.appointments);
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
        tableBody.innerHTML = `<tr><td colspan="7">Error al cargar citas.</td></tr>`;
    }
}

// Renderiza a tabela (pode adaptar da sua lógica de prontuários)
function renderAppointmentsTable(appointments) {
    const tableBody = document.getElementById('dia-appointments-table-body');
    tableBody.innerHTML = '';

    if (appointments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7">No hay citas para este día.</td></tr>`;
        return;
    }

    // Ordena por hora
    appointments.sort((a, b) => (a.hora_formatada || '').localeCompare(b.hora_formatada || ''));

    appointments.forEach(app => {
        const row = tableBody.insertRow();
        const valorFormatado = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(app.valor || 0);

        row.innerHTML = `
            <td>${app.hora_formatada || '--:--'}</td>
            <td>${app.paciente_nome || 'N/A'}</td>
            <td>${app.tipo_consulta || 'N/A'}</td>
            <td>${app.profissional_nome || 'N/A'}</td>
            <td><span class="status-${(app.status || '').toLowerCase()}">${app.status || '?'}</span></td>
            <td>${valorFormatado}</td>
            <td>
                <button class="btn-icon edit-btn" title="Editar" data-id="${app.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete-btn" title="Eliminar" data-id="${app.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
    
    // Adiciona os event listeners para os botões após renderizar a tabela
    attachEventListeners();
}

// Adiciona event listeners para os botões de editar e excluir
function attachEventListeners() {
    const tableBody = document.getElementById('dia-appointments-table-body');
    
    if (!tableBody) return;
    
    // Usamos delegação de eventos para lidar com os cliques nos botões
    tableBody.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        
        const appointmentId = target.getAttribute('data-id');
        if (!appointmentId) {
            console.error('ID do agendamento não encontrado');
            return;
        }
        
        if (target.classList.contains('edit-btn')) {
            // Salva o ID do agendamento no sessionStorage e navega para a página de edição
            sessionStorage.setItem('editingAppointmentId', appointmentId);
            navigateTo('editar-cita');
        } else if (target.classList.contains('delete-btn')) {
            // Confirma a exclusão e chama a função para excluir o agendamento
            if (confirm(`¿Está seguro que desea eliminar esta cita?`)) {
                deleteAppointment(appointmentId);
            }
        }
    });
    
    // Adiciona event listener para o botão de voltar
    const backButton = document.querySelector('.back-button[data-page="agendamento"]');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('agendamento');
        });
    }
}

// Função para excluir um agendamento
async function deleteAppointment(appointmentId) {
    if (!appointmentId) {
        showNotification('ID do agendamento inválido', 'error');
        return;
    }

    showNotification('Excluindo agendamento...', 'info');

    try {
        const response = await fetch(`/api/agendamentos/${appointmentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Erro ${response.status}`);
        }

        showNotification('Agendamento excluído com sucesso!', 'success');
        
        // Recarrega os agendamentos para atualizar a tabela
        const dataSelecionada = sessionStorage.getItem('dataSelecionada');
        if (dataSelecionada) {
            loadAppointmentsForDay(dataSelecionada);
        }
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        showNotification(`Erro ao excluir: ${error.message}`, 'error');
    }
}