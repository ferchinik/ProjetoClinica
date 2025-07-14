// clinica/public/js/forms/editar-cita.js
import { navigateTo } from '../navigation.js';
import { showNotification } from '../notification.js';

let currentEditingAppointmentId = null;

/**
 * Busca profissionais da API e preenche o select (Reutilizada ou Adaptada de nueva-cita.js).
 * @param {string} [selectedProfessionalId] - Opcional: ID do profissional a ser pré-selecionado.
 */
async function populateEditProfessionalsSelect(selectedProfessionalId = null) {
    const select = document.getElementById('editProfessional');
    if (!select) {
        console.error("Dropdown #editProfessional não encontrado.");
        return;
    }

    select.disabled = true;
    select.innerHTML = '<option value="">Carregando...</option>'; // Limpa e adiciona loading

    try {
        const response = await fetch('/profissionais', { credentials: 'include' });
        if (!response.ok) {
             let errorMsg = `Erro HTTP ${response.status}`;
             try { errorMsg = (await response.json()).message || errorMsg; } catch(e){}
             throw new Error(errorMsg);
        }
        const professionals = await response.json();

        select.innerHTML = '<option value="">Selecione o profissional</option>'; // Opção padrão

        if (Array.isArray(professionals)) {
            professionals.forEach(prof => {
                if (prof.id && prof.nombre) {
                    const option = document.createElement('option');
                    option.value = prof.id;
                    option.textContent = prof.nombre;
                    // Pré-seleciona se o ID corresponder (convertendo ambos para string para comparação segura)
                    if (selectedProfessionalId !== null && String(prof.id) === String(selectedProfessionalId)) {
                        option.selected = true;
                        console.log(`Profissional ${prof.nombre} (ID: ${prof.id}) pré-selecionado.`);
                    }
                    select.appendChild(option);
                }
            });
            if (select.options.length <= 1 && professionals.length === 0) {
                 select.options[0].textContent = 'Nenhum prof. cadastrado';
            } else {
                 select.disabled = false;
            }
        } else {
             console.error("API de profissionais não retornou um array.");
             throw new Error("Formato inválido da API de profissionais.");
        }

    } catch (error) {
        console.error('Erro ao popular profissionais (edição):', error);
        showNotification(`Erro ao carregar profissionais: ${error.message}`, 'error');
        select.innerHTML = '<option value="">Erro ao carregar</option>';
        select.disabled = true;
    }
}


/**
 * Busca os dados do agendamento e preenche o formulário.
 */
async function loadAppointmentDataForEdit() {
    const form = document.getElementById('editarCitaForm');
    if (!form) return;

    currentEditingAppointmentId = sessionStorage.getItem('editingAppointmentId');

    if (!currentEditingAppointmentId) {
        console.log('Editar Agendamento: Nenhum ID encontrado na sessão, redirecionando...');
        navigateTo('agendamento');
        return;
    }
    console.log(`Editando Agendamento ID: ${currentEditingAppointmentId}`);

    // Preenche o campo oculto
    const idInput = document.getElementById('appointmentId');
    if (idInput) idInput.value = currentEditingAppointmentId;
    else console.warn("Campo oculto #appointmentId não encontrado");

    try {
        showNotification("Carregando dados do agendamento...", "info");
        const response = await fetch(`/api/agendamentos/${currentEditingAppointmentId}`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok || !data.success || !data.agendamento) {
            throw new Error(data.message || `Erro ${response.status} ao buscar agendamento.`);
        }

        const ag = data.agendamento;
        console.log("Dados recebidos para edição:", ag);

        // Preenche os campos do formulário
        form.elements['pacienteName'].value = ag.paciente_nome || '';

        // Separa data e hora
        if (ag.data_hora) {
            try {
                 // Tenta criar uma data a partir do formato recebido
                 const dateTime = new Date(ag.data_hora);

                 // Verifica se a data é válida
                 if (isNaN(dateTime.getTime())) {
                     throw new Error("Data/Hora inválida recebida do backend");
                 }

                 // Formata para YYYY-MM-DD para o input date
                 const year = dateTime.getFullYear();
                 const month = String(dateTime.getMonth() + 1).padStart(2, '0');
                 const day = String(dateTime.getDate()).padStart(2, '0');
                 form.elements['appointmentDate'].value = `${year}-${month}-${day}`;

                 // Formata para HH:MM para o input time
                 const hours = String(dateTime.getHours()).padStart(2, '0');
                 const minutes = String(dateTime.getMinutes()).padStart(2, '0');
                 form.elements['appointmentTime'].value = `${hours}:${minutes}`;

            } catch(e) {
                 console.error("Erro ao formatar data/hora recebida:", ag.data_hora, e);
                 showNotification("Formato de data/hora inválido recebido.", "warning");
                 form.elements['appointmentDate'].value = '';
                 form.elements['appointmentTime'].value = '';
            }
        } else {
            form.elements['appointmentDate'].value = '';
            form.elements['appointmentTime'].value = '';
        }

        form.elements['appointmentType'].value = ag.tipo_consulta || '';
        form.elements['status'].value = ag.status || 'Pendente'; // Usa o status recebido
        form.elements['observacoes'].value = ag.observacoes || ''; // Preenche observações

        // Popula e pré-seleciona o profissional
        await populateEditProfessionalsSelect(ag.profissional_id);

        // Remove notificação de loading após sucesso
        // (showNotification já some sozinha, mas pode forçar se quiser)

    } catch (error) {
        console.error("Erro ao carregar dados para edição:", error);
        showNotification(`Falha ao carregar agendamento: ${error.message}`, 'error');
        navigateTo('agendamento'); // Volta se falhar
    }
}

/**
 * Manipulador para o submit do formulário de edição.
 */
async function handleEditFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Pega o ID do campo oculto OU da variável global (redundância)
    const appointmentId = form.elements['id'].value || currentEditingAppointmentId;

    if (!appointmentId) {
        showNotification("Erro crítico: ID do agendamento perdido.", "error");
        if (submitButton) submitButton.disabled = false; // Reabilita se falhar aqui
        return;
    }

    if (submitButton) submitButton.disabled = true;
    showNotification("Atualizando agendamento...", "info");

    try {
        const formData = new FormData(form);
        const updatedData = Object.fromEntries(formData.entries());
        console.log(">>> DEBUG: Dados coletados para ATUALIZAR:", updatedData);

        // Validações básicas (similares à criação)
        const requiredFields = ['pacienteName', 'appointmentDate', 'appointmentTime', 'appointmentType', 'professional', 'status'];
        const missingFields = requiredFields.filter(field => !updatedData[field]?.trim());
        if (missingFields.length > 0) {
            throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
        }
        // Validação de status (exemplo)
        const validStatus = ['Pendente', 'Confirmado', 'Cancelado', 'Realizado', 'No Show'];
         if (!validStatus.includes(updatedData.status)) {
             throw new Error('Status selecionado inválido.');
         }

        // --- ENVIO PARA A API (PUT) ---
        const response = await fetch(`/api/agendamentos/${appointmentId}`, { // Usa o ID na URL
            method: 'PUT', // Método PUT para atualização
            headers: { 'Content-Type': 'application/json' },
             // Envia os dados como coletados, o controller fará a formatação se necessário
            body: JSON.stringify(updatedData),
            credentials: 'include'
        });

        // --- PROCESSAMENTO DA RESPOSTA ---
        const result = await response.json().catch(async (err) => {
             console.warn("Resposta da API (edição) não era JSON:", err);
             const textResponse = await response.text();
             return { success: false, message: textResponse || `Erro ${response.status}` };
         });

        console.log(">>> DEBUG: Resposta da API (edição):", result);

        if (!response.ok) {
            throw new Error(result.message || `Erro ${response.status} ao atualizar.`);
        }
        if (result.success === false) {
             throw new Error(result.message || 'Falha ao atualizar agendamento.');
        }

        // --- SUCESSO ---
        showNotification(result.message || 'Agendamento atualizado com sucesso!', 'success');
        sessionStorage.removeItem('editingAppointmentId'); // Limpa o ID da sessão APÓS sucesso
        currentEditingAppointmentId = null;
        form.reset();
        navigateTo('agendamento'); // Volta para a agenda

    } catch (error) {
        // --- TRATAMENTO DE ERRO ---
        console.error(">>> DEBUG: Erro no bloco try/catch do handleEditFormSubmit:", error);
        showNotification(error.message || 'Erro desconhecido ao atualizar agendamento', 'error');
    } finally {
        // --- FINALIZAÇÃO ---
        if (submitButton) submitButton.disabled = false;
    }
}


/**
 * Função de inicialização chamada pela navegação.
 */
export function initEditarCitaForm() {
    console.log(">>> DEBUG: initEditarCitaForm FOI CHAMADA <<<");
    const form = document.getElementById('editarCitaForm');
    const cancelButton = form ? form.querySelector('.cancel-btn') : null;

    if (!form) {
        console.error("Erro: Formulário #editarCitaForm não encontrado.");
        return;
    }

    // Carrega os dados do agendamento para o formulário
    loadAppointmentDataForEdit();

    // Adiciona listener de submit (removendo o antigo primeiro)
    form.removeEventListener('submit', handleEditFormSubmit);
    form.addEventListener('submit', handleEditFormSubmit);

    // Listener do botão Cancelar
     if (cancelButton) {
        // Remove listener antigo para evitar duplicação
        const newCancelButton = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

        newCancelButton.addEventListener('click', (e) => {
            // Verifica se a navegação JÁ será tratada pelo listener global (data-page)
            if (!e.target.closest('[data-page]')) {
                 e.preventDefault();
                 console.log("Botão Cancelar (edição) clicado.");
                 sessionStorage.removeItem('editingAppointmentId'); // Limpa ID se cancelar
                 currentEditingAppointmentId = null;
                 navigateTo('agendamento');
            } else {
                // Deixa o listener global de data-page fazer a navegação
                 console.log("Botão Cancelar (edição) com data-page clicado, navegação global cuidará.");
                 sessionStorage.removeItem('editingAppointmentId'); // Limpa ID mesmo assim
                 currentEditingAppointmentId = null;
            }
        });
    }
    console.log("Frontend: Inicialização de 'initEditarCitaForm' concluída.");
}