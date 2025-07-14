// clinica/public/js/forms/nueva-cita.js
import { navigateTo } from '../navigation.js';
import { showNotification } from '../notification.js';

// Constante para formatação de moeda
const CURRENCY_FORMAT = {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
};

/**
 * Busca profissionais da API e preenche o select.
 */
async function populateProfessionalsSelect() {
    const select = document.getElementById('professional');
    if (!select) { console.error("Dropdown #professional não encontrado."); return; }
    select.disabled = true; select.options[0].textContent = 'Carregando...';
    while (select.options.length > 1) { select.remove(1); }
    try {
        const response = await fetch('/profissionais', { credentials: 'include' });
        if (!response.ok) { let errorMsg = `Erro HTTP ${response.status}`; try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e) {} throw new Error(`Erro ao buscar profissionais: ${errorMsg}`); }
        const professionals = await response.json();
        if (Array.isArray(professionals)) {
            professionals.forEach(prof => { if (prof.id && prof.nombre) { const option = document.createElement('option'); option.value = prof.id; option.textContent = prof.nombre; select.appendChild(option); } else { console.warn("Profissional inválido:", prof); } });
             if (select.options.length <= 1 && professionals.length === 0) { select.options[0].textContent = 'Nenhum prof. cadastrado'; } else { select.options[0].textContent = 'Selecione o profissional'; select.disabled = false; }
        } else { throw new Error("Formato de resposta inválido."); }
    } catch (error) { console.error('Erro ao popular profissionais:', error); showNotification(`Erro profissionais: ${error.message}`, 'error'); select.options[0].textContent = 'Erro ao carregar'; select.disabled = true; }
}

/**
 * Busca clientes no banco de dados baseado no termo de busca
 * @param {string} searchTerm - Termo para buscar clientes
 */
async function searchClients(searchTerm) {
    try {
        const response = await fetch(`/api/clientes?search=${encodeURIComponent(searchTerm)}&limit=10`, { credentials: 'include' });
        if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
        const data = await response.json();
        return data.clients || [];
    } catch (error) { console.error('Erro ao buscar clientes:', error); return []; }
}

/**
 * Atualiza a lista de sugestões de clientes no datalist
 * @param {string} searchTerm - O termo digitado no input
 */
async function updateClientSuggestions(searchTerm) {
    const datalist = document.getElementById('clientesList');
    if (!datalist) return;
    datalist.innerHTML = '';
    if (searchTerm.length < 2) return;
    const clients = await searchClients(searchTerm);
    clients.forEach(client => { const option = document.createElement('option'); option.value = client.nome_completo; datalist.appendChild(option); });
}

/**
 * Inicializa o formulário de nova cita.
 */
export function initNuevaCitaForm() {
    console.log(">>> DEBUG: initNuevaCitaForm FOI CHAMADA <<<");
    const form = document.getElementById('nuevaCitaForm');
    const pacienteInput = document.getElementById('pacienteName');
    const dateInput = document.getElementById('appointmentDate');

    if (!form) { console.error("Frontend Error: Formulário #nuevaCitaForm não encontrado."); return; }

    // --- LÓGICA PARA PRÉ-PREENCHER O NOME ---
    const clientIdFromDetails = sessionStorage.getItem('schedulingClientId');
    const clientNameFromDetails = sessionStorage.getItem('schedulingClientName');

    if (clientIdFromDetails && clientNameFromDetails && pacienteInput) {
        console.log(`Pré-preenchendo nome: ${clientNameFromDetails} (ID: ${clientIdFromDetails})`);
        pacienteInput.value = clientNameFromDetails;
        // Limpa os dados da sessão após usar
        sessionStorage.removeItem('schedulingClientId');
        sessionStorage.removeItem('schedulingClientName');
        // Opcional: Focar no próximo campo, como data
        if (dateInput) dateInput.focus();
    }
    // --- FIM DA LÓGICA DE PRÉ-PREENCHIMENTO ---

    // Configura o input de paciente para buscar clientes (datalist)
    if (pacienteInput) {
        pacienteInput.removeEventListener('input', handlePatientInput); // Remove listener antigo
        pacienteInput.addEventListener('input', handlePatientInput);
    }

    function handlePatientInput(e) {
        const inputElement = e.target;
        if (inputElement.timeoutId) clearTimeout(inputElement.timeoutId);
        inputElement.timeoutId = setTimeout(() => {
            updateClientSuggestions(inputElement.value);
        }, 300);
    }

    populateProfessionalsSelect();

    form.removeEventListener('submit', handleFormSubmit); // Remove listener antigo
    form.addEventListener('submit', handleFormSubmit);

    // Define data padrão se vazia
    if (dateInput && !dateInput.value) {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }

    console.log("Frontend: initNuevaCitaForm concluído.");
}


/**
 * Manipulador para o evento de submit do formulário.
 * @param {Event} event - O evento de submit.
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) submitButton.disabled = true;
    showNotification("Agendando consulta...", "info");

    try {
        const formData = new FormData(form);
        const appointmentData = Object.fromEntries(formData.entries());
        console.log("Dados coletados do form:", appointmentData);

        // Validações básicas
        const requiredFields = ['pacienteName', 'appointmentDate', 'appointmentTime', 'appointmentType', 'professional'];
        const missingFields = requiredFields.filter(field => !appointmentData[field]?.trim());
        if (missingFields.length > 0) throw new Error(`Campos obrigatórios: ${missingFields.join(', ')}`);
        if (appointmentData.appointmentValue) { const valor = parseFloat(appointmentData.appointmentValue.replace(/[^\d,-]/g, '')); if (isNaN(valor) || valor < 0) throw new Error("Valor inválido."); appointmentData.appointmentValue = Math.round(valor); }
        const appointmentDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`); if (isNaN(appointmentDateTime.getTime())) throw new Error("Data/hora inválida."); if (isNaN(parseInt(appointmentData.professional))) console.warn("ID profissional não numérico:", appointmentData.professional)

        // Formatação para backend
        const backendData = {
            pacienteName: appointmentData.pacienteName.trim(),
            appointmentDate: appointmentData.appointmentDate,
            appointmentTime: appointmentData.appointmentTime,
            appointmentType: appointmentData.appointmentType.trim(),
            professional: appointmentData.professional,
            observacoes: appointmentData.observacoes || null,
            appointmentValue: appointmentData.appointmentValue ? Math.round(parseFloat(appointmentData.appointmentValue)) : null
        };
        console.log("Dados formatados para backend:", backendData);

        // Envio para API
        const response = await fetch('/api/agendamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(backendData), credentials: 'include' });
        const result = await response.json().catch(async () => ({ success: false, message: await response.text() || `Erro ${response.status}` }));
        console.log("Resposta API:", result);
        if (!response.ok || result.success === false) throw new Error(result.message || `Erro ${response.status}.`);

        // Sucesso
        showNotification(result.message || 'Agendamento criado!', 'success');
        form.reset();
        const dateInput = document.getElementById('appointmentDate'); if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        navigateTo('agendamento');

    } catch (error) {
        console.error("Erro handleFormSubmit:", error);
        showNotification(error.message || 'Erro desconhecido', 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}
