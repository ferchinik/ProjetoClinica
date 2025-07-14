// public/js/calendar.js 
import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';

let currentDate = new Date(); 
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
let monthlyAppointmentsData = {}; 
let selectedDateElement = null; 

export function initCalendar() {
    console.log("calendar.js: initCalendar() chamada.");
    const prevMonthBtn = document.querySelector('.prev-month');
    const nextMonthBtn = document.querySelector('.next-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const appointmentsListContainer = document.getElementById('appointments-list');
    const appointmentTemplate = document.getElementById('appointment-template');

    if (!calendarGrid || !appointmentsListContainer || !appointmentTemplate) { console.error("calendar.js FATAL: Elementos essenciais não encontrados."); return; }
    else { console.log("calendar.js: Elementos essenciais encontrados."); const errorMsg = document.querySelector('#agendamento .init-error'); if (errorMsg) errorMsg.remove(); }

    if (prevMonthBtn) replaceListener(prevMonthBtn, 'click', () => navigateMonth(-1)); else console.warn("Botão .prev-month não encontrado.");
    if (nextMonthBtn) replaceListener(nextMonthBtn, 'click', () => navigateMonth(1)); else console.warn("Botão .next-month não encontrado.");
    replaceListener(calendarGrid, 'click', handleDayClick);

    if (appointmentsListContainer && !appointmentsListContainer.dataset.listenerAttached) {
        appointmentsListContainer.addEventListener('click', handleAppointmentActionClick); // <-- Listener aqui
        appointmentsListContainer.dataset.listenerAttached = 'true';
        console.log("calendar.js: Listener de delegação para ações adicionado.");
    } else if (appointmentsListContainer?.dataset?.listenerAttached === 'true') {
        console.log("calendar.js: Listener de delegação para ações JÁ ESTAVA adicionado.");
    }

    currentDate = new Date();
    updateCalendarAndEvents();
    console.log("calendar.js: initCalendar() concluída.");
}

function handleDayClick(event) {
    const dayElement = event.target.closest('.calendar-day:not(.disabled)');
    if (!dayElement?.dataset?.date) return;

    const dateString = dayElement.dataset.date;
    console.log(`calendar.js: Dia ${dateString} clicado. Navegando para a página de detalhes.`);

    // 1. Salva a data clicada no sessionStorage para a outra página poder ler
    sessionStorage.setItem('dataSelecionada', dateString);

    // 2. Usa a função navigateTo para mudar de página
    navigateTo('dia-agendamentos');
}

function handleAppointmentActionClick(event) {
    console.log(">>> DEBUG: handleAppointmentActionClick FOI CHAMADO! Evento:", event);
    const clickedElement = event.target;
    console.log(">>> DEBUG: Elemento clicado (target):", clickedElement);

    const button = clickedElement.closest('button.btn-icon');
    const appointmentItem = clickedElement.closest('.today-appointment-item');
    const appointmentId = appointmentItem?.dataset?.appointmentId;
    console.log(">>> DEBUG: Tentativa de encontrar botão:", button);
    console.log(">>> DEBUG: Tentativa de encontrar item pai:", appointmentItem);
    console.log(">>> DEBUG: Tentativa de encontrar ID:", appointmentId);

    if (!button || !appointmentItem || !appointmentId) {

        if (!button) console.log(">>> DEBUG: FALHA - Não encontrou o BOTÃO (<button class='btn-icon...'>)");
        if (!appointmentItem) console.log(">>> DEBUG: FALHA - Não encontrou o ITEM PAI (<div class='today-appointment-item'>)");
        if (!appointmentId) console.log(">>> DEBUG: FALHA - Não encontrou o ID no item pai (data-appointment-id)");
        console.log(">>> DEBUG: Saindo de handleAppointmentActionClick (informações essenciais faltando).");
        return; 
    }
    console.log(`>>> DEBUG: SUCESSO! Botão: ${button.outerHTML}, Item ID: ${appointmentId}`);
    console.log(`>>> DEBUG: Classe do botão: ${button.className}`);

    if (button.classList.contains('edit-btn')) {
        console.log(">>> DEBUG: Ação EDITAR será executada.");
        console.log(`calendar.js: Edit ID: ${appointmentId}`);
        sessionStorage.setItem('editingAppointmentId', appointmentId);
        navigateTo('editar-cita');
    } else if (button.classList.contains('delete-btn')) {
        console.log(">>> DEBUG: Ação EXCLUIR será executada.");
        console.log(`calendar.js: Delete ID: ${appointmentId}`);
        console.log(">>> DEBUG: Vai chamar confirm() para exclusão.");
        if (confirm(`Tem certeza que deseja excluir o agendamento ID ${appointmentId}?`)) {
            console.log(">>> DEBUG: Exclusão confirmada pelo usuário.");
            deleteAppointment(appointmentId);
        } else {
            console.log(">>> DEBUG: Exclusão cancelada pelo usuário.");
        }
    } else if (button.classList.contains('confirm-btn')) {
        console.log(">>> DEBUG: Ação CONFIRMAR será executada.");
        console.log(`calendar.js: Confirm ID: ${appointmentId}`);
        updateAppointmentStatus(appointmentId, 'Confirmado', appointmentItem);
    } else if (button.classList.contains('complete-btn')) {
        console.log(">>> DEBUG: Ação COMPLETAR será executada.");
        console.log(`calendar.js: Complete ID (Realizado): ${appointmentId}`);
        updateAppointmentStatus(appointmentId, 'Realizado', appointmentItem);
    } else {
        console.log(">>> DEBUG: Nenhuma ação conhecida para o botão:", button.className);
    }
}
async function updateCalendarAndEvents() {
    const calendarGrid = document.getElementById('calendar-grid'); if (!calendarGrid) { console.error("calendar.js updateCalendarAndEvents: #calendar-grid não encontrado"); return; } console.log("calendar.js: updateCalendarAndEvents() - Iniciando..."); calendarGrid.innerHTML = '<div class="loading-calendar">Carregando calendário...</div>'; const year = currentDate.getUTCFullYear(); const month = currentDate.getUTCMonth(); if (isNaN(year) || isNaN(month)) { console.error("Erro GRAVE: Ano ou Mês inválidos em currentDate:", currentDate); showNotification("Erro interno ao obter data atual.", "error"); calendarGrid.innerHTML = '<div class="error-calendar">Erro ao obter data.</div>'; return; } const monthForAPI = month + 1; const apiUrl = `/api/agendamentos/month?year=${year}&month=${monthForAPI}`; console.log(`>>> DEBUG updateCalendarAndEvents: Tentando buscar URL: ${apiUrl}`);
    try { const response = await fetch(apiUrl, { credentials: 'include' }); if (!response.ok) { let errorMsg = `Erro HTTP ${response.status}`; try { errorMsg = (await response.json()).message || errorMsg; } catch (e) { } throw new Error(errorMsg); } const data = await response.json(); if (!data.success) { throw new Error(data.message || "Falha ao buscar dados do mês (success: false)."); } monthlyAppointmentsData = data.appointmentsByDate || {}; console.log("calendar.js: Dados do mês carregados:", monthlyAppointmentsData); } catch (error) { console.error("calendar.js: Erro ao buscar dados do mês:", error); showNotification(`Erro ao carregar calendário: ${error.message || 'Erro desconhecido'}`, 'error'); monthlyAppointmentsData = {}; }
    renderCalendarGrid(year, month); if (currentDate) { loadAppointmentsForSelectedDay(currentDate); updateSelectedDayVisuals(); } else { const appointmentsList = document.getElementById('appointments-list'); if (appointmentsList) appointmentsList.innerHTML = '<p class="placeholder-message">Selecione um dia.</p>'; } console.log("calendar.js: updateCalendarAndEvents() - Concluído.");
}
function renderCalendarGrid(year, month) {
    const calendarGrid = document.getElementById('calendar-grid'); if (!calendarGrid) { console.error("calendar.js renderCalendarGrid: #calendar-grid não encontrado"); return; } calendarGrid.innerHTML = ''; weekDays.forEach(day => { const dayHeader = document.createElement('div'); dayHeader.className = 'calendar-day-header'; dayHeader.textContent = day; calendarGrid.appendChild(dayHeader); }); const currentMonthElement = document.querySelector('.current-month'); if (currentMonthElement) currentMonthElement.textContent = `${monthNames[month]} ${year}`; const firstDayOfMonth = new Date(Date.UTC(year, month, 1)); const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)); const firstDayOfWeek = firstDayOfMonth.getUTCDay(); for (let i = 0; i < firstDayOfWeek; i++) { const prevDate = new Date(Date.UTC(year, month, 1 - (firstDayOfWeek - i))); addDayToCalendar(prevDate, true); } for (let day = 1; day <= lastDayOfMonth.getUTCDate(); day++) { const date = new Date(Date.UTC(year, month, day)); addDayToCalendar(date, false); } const totalDaysRendered = firstDayOfWeek + lastDayOfMonth.getUTCDate(); let remainingCells = 7 - (totalDaysRendered % 7); if (remainingCells === 7) remainingCells = 0; const cellsToAdd = remainingCells; for (let i = 1; i <= cellsToAdd; i++) { const nextDate = new Date(Date.UTC(year, month + 1, i)); addDayToCalendar(nextDate, true); } console.log("calendar.js: Grid do calendário renderizado.");
}

function addDayToCalendar(dateUTC, disabled) {
    const calendarGrid = document.getElementById('calendar-grid'); if (!calendarGrid) return; const dayElement = document.createElement('div'); dayElement.className = 'calendar-day' + (disabled ? ' disabled' : ''); const now = new Date(); const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); if (dateUTC.getTime() === todayUTC.getTime() && !disabled) { dayElement.classList.add('today'); } const dayNumber = document.createElement('span'); dayNumber.className = 'day-number'; dayNumber.textContent = dateUTC.getUTCDate(); dayElement.appendChild(dayNumber); const dateString = dateUTC.toISOString().split('T')[0]; dayElement.dataset.date = dateString;

    if (!disabled && monthlyAppointmentsData && monthlyAppointmentsData[dateString]) {
        dayElement.classList.add('has-events');
        const appointmentsForDay = monthlyAppointmentsData[dateString];
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events'; 
        const maxEventsToShow = 2; 
        appointmentsForDay.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

        appointmentsForDay.slice(0, maxEventsToShow).forEach(app => {
            const eventElement = document.createElement('div');
            eventElement.className = 'day-event-item'; 

            const timeDisplay = app.hora ? app.hora.substring(0, 5) : '--:--'; 
            const patNameShort = app.paciente_nome?.split(' ')[0] || 'Pac.'; 
            const profNameShort = app.profissional_nome?.split(' ')[0] || 'Prof.'; 
            eventElement.textContent = `${timeDisplay} ${patNameShort} (${profNameShort})`;
            eventElement.title = `${timeDisplay} - ${app.paciente_nome || '?'} (${app.tipo_consulta || '?'}) com ${app.profissional_nome || 'N/D'}`;

            eventsContainer.appendChild(eventElement);
        });

        if (appointmentsForDay.length > maxEventsToShow) {
            const moreEventsElement = document.createElement('div');
            moreEventsElement.className = 'day-event-more'; 
            moreEventsElement.textContent = `+${appointmentsForDay.length - maxEventsToShow} mais...`;
            eventsContainer.appendChild(moreEventsElement);
        }

        dayElement.appendChild(eventsContainer); 
    }

    calendarGrid.appendChild(dayElement);
}
function updateSelectedDayVisuals() {
    const allDays = document.querySelectorAll('#calendar-grid .calendar-day'); let selectedFound = false; if (!currentDate) { allDays.forEach(day => day.classList.remove('selected')); selectedDateElement = null; } else { const selectedDateString = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate())).toISOString().split('T')[0]; allDays.forEach(day => { const isSelected = day.dataset.date === selectedDateString && !day.classList.contains('disabled'); day.classList.toggle('selected', isSelected); if (isSelected) { selectedDateElement = day; selectedFound = true; } }); if (!selectedFound) selectedDateElement = null; } const appointmentsDateHeader = document.getElementById('data-atual')?.querySelector('.date-display'); if (appointmentsDateHeader && currentDate) { try { appointmentsDateHeader.textContent = currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { console.error("Erro ao formatar título da data:", e); appointmentsDateHeader.textContent = currentDate.toISOString().split('T')[0]; } } else if (appointmentsDateHeader) { appointmentsDateHeader.textContent = "Selecione um dia"; }
}
function navigateMonth(delta) {
    const year = currentDate.getUTCFullYear(); const month = currentDate.getUTCMonth(); const newMonthDate = new Date(Date.UTC(year, month + delta, 1)); console.log(`calendar.js: Navegando para ${monthNames[newMonthDate.getUTCMonth()]} ${newMonthDate.getUTCFullYear()}`); currentDate = newMonthDate; const appointmentsList = document.getElementById('appointments-list'); if (appointmentsList) appointmentsList.innerHTML = '<p class="placeholder-message">Carregando calendário...</p>'; updateCalendarAndEvents();
}
async function loadAppointmentsForSelectedDay(dateUTC) {
    const appointmentsList = document.getElementById('appointments-list'); const appointmentTemplate = document.getElementById('appointment-template'); if (!appointmentsList || !appointmentTemplate) { return; } if (!dateUTC || !(dateUTC instanceof Date) || isNaN(dateUTC)) { return; } const dateStr = dateUTC.toISOString().split('T')[0]; const apiUrl = `/api/agendamentos?date=${dateStr}`; console.log(`calendar.js: loadAppointmentsForSelectedDay - Buscando detalhes para ${dateStr} em ${apiUrl}`); updateSelectedDayVisuals(); appointmentsList.innerHTML = '<p class="loading-message">Carregando detalhes...</p>'; try { const response = await fetch(apiUrl, { credentials: 'include' }); const data = await response.json(); if (!response.ok) throw new Error(data.message || `Erro HTTP ${response.status}`); if (!data.success) throw new Error(data.message || 'Falha ao buscar detalhes.'); displayDetailedAppointments(data.appointments || []); } catch (error) { console.error(`calendar.js: Erro ao carregar detalhes para ${dateStr}:`, error); showNotification(`Erro ao carregar detalhes: ${error.message || 'Erro desconhecido'}`, 'error'); appointmentsList.innerHTML = `<p class="error-message">Falha ao carregar detalhes: ${error.message}</p>`; }
}
function displayDetailedAppointments(appointments) {
    const appointmentsList = document.getElementById('appointments-list'); const template = document.getElementById('appointment-template'); if (!appointmentsList || !template || !template.content) { return; } appointmentsList.innerHTML = ''; if (!Array.isArray(appointments)) { return; } if (appointments.length === 0) { appointmentsList.innerHTML = '<p class="placeholder-message">Nenhum agendamento para esta data.</p>'; return; } console.log(`calendar.js displayDetailedAppointments: Renderizando ${appointments.length} agendamentos...`); appointments.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00')); appointments.forEach((appointment, index) => {
        if (!appointment?.id) { console.warn(`Ignorando item inválido no índice ${index}:`, appointment); return; } try {
            const appointmentElement = template.content.cloneNode(true); const itemContainer = appointmentElement.querySelector('.today-appointment-item'); if (itemContainer) itemContainer.dataset.appointmentId = appointment.id; const timeElement = appointmentElement.querySelector('.time'); const clientName = appointmentElement.querySelector('.client-name'); const appointmentType = appointmentElement.querySelector('.appointment-type'); const statusElement = appointmentElement.querySelector('.appointment-status'); const clientPhoto = appointmentElement.querySelector('.client-photo'); const valueElement = appointmentElement.querySelector('.appointment-value .value'); const detailsDiv = appointmentElement.querySelector('.client-info > div'); if (timeElement) timeElement.textContent = appointment.hora_formatada || appointment.hora?.substring(0, 5) || '--:--'; if (clientName) clientName.textContent = appointment.paciente_nome || '?'; if (appointmentType) appointmentType.textContent = appointment.tipo_consulta || '?';
            const CURRENCY_FORMAT = {
                style: 'currency',
                currency: 'PYG',
                maximumFractionDigits: 0,
                minimumFractionDigits: 0
            };
            if (valueElement) {
                const value = appointment.valor;
                if (value !== null && value !== undefined && !isNaN(value)) {
                    valueElement.textContent = new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(value);
                } else {
                    valueElement.textContent = 'Gs. 0';
                }
            }
            if (statusElement) { const statusText = appointment.status || 'Pendente'; statusElement.textContent = statusText; let statusClass = 'status-default'; switch (statusText.toLowerCase()) { case 'pendente': statusClass = 'status-pending'; break; case 'confirmado': statusClass = 'status-confirmed'; break; case 'cancelado': statusClass = 'status-cancelled'; break; case 'realizado': statusClass = 'status-done'; break; case 'no show': statusClass = 'status-noshow'; break; } statusElement.className = 'appointment-status'; statusElement.classList.add(statusClass); } if (clientPhoto) { clientPhoto.src = '/img/users/default-avatar.png'; const photoPath = appointment.foto_perfil?.replace(/\\/g, '/'); if (photoPath?.trim()) { clientPhoto.src = `/${photoPath}`; } clientPhoto.alt = appointment.paciente_nome || 'Cliente'; clientPhoto.onerror = () => { clientPhoto.src = '/img/users/default-avatar.png'; clientPhoto.onerror = null; }; } if (detailsDiv && appointment.profissional_nome) { const existingP = detailsDiv.querySelector('.professional-name'); if (existingP) existingP.remove(); const professionalNameElement = document.createElement('p'); professionalNameElement.className = 'professional-name'; professionalNameElement.style.cssText = 'font-size: 0.8rem; color: var(--text-secondary, #6c757d); margin-top: 2px; display: flex; align-items: center;'; professionalNameElement.innerHTML = `<i class="fas fa-user-md" style="margin-right: 5px; width: 1em; text-align: center;"></i> ${appointment.profissional_nome}`; detailsDiv.appendChild(professionalNameElement); } const confirmBtn = appointmentElement.querySelector('.confirm-btn'); const completeBtn = appointmentElement.querySelector('.complete-btn'); const editBtn = appointmentElement.querySelector('.edit-btn'); const deleteBtn = appointmentElement.querySelector('.delete-btn'); const isCancelled = (appointment.status || '').toLowerCase() === 'cancelado'; const isDone = (appointment.status || '').toLowerCase() === 'realizado'; const isConfirmed = (appointment.status || '').toLowerCase() === 'confirmado'; if (confirmBtn) confirmBtn.disabled = isConfirmed || isDone || isCancelled; if (completeBtn) completeBtn.disabled = isDone || isCancelled; if (editBtn) editBtn.disabled = isDone || isCancelled; if (deleteBtn) deleteBtn.disabled = isDone; appointmentsList.appendChild(appointmentElement);
        } catch (error) { console.error(`calendar.js displayDetailedAppointments: Erro ao renderizar item ${index}:`, error, appointment); }
    }); console.log("calendar.js displayDetailedAppointments: Renderização detalhada concluída.");
}
async function deleteAppointment(id) {
    if (!id) return; console.log(`calendar.js: Tentando excluir agendamento ID: ${id}`); showNotification('Excluindo agendamento...', 'info'); const apiUrl = `/api/agendamentos/${id}`; try { const response = await fetch(apiUrl, { method: 'DELETE', credentials: 'include' }); let data = { success: response.ok, message: response.statusText }; try { data = await response.json(); } catch (e) { /* Ignora */ } if (!response.ok || !data.success) throw new Error(data.message || `Erro ${response.status}`); showNotification(data.message || 'Agendamento excluído!', 'success'); const itemToRemove = document.querySelector(`#appointments-list .today-appointment-item[data-appointment-id="${id}"]`); if (itemToRemove) { /* ... anima e remove ... */ itemToRemove.style.opacity = '0'; itemToRemove.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'; itemToRemove.style.transform = 'scale(0.95)'; setTimeout(() => { itemToRemove.remove(); const list = document.getElementById('appointments-list'); if (list && list.children.length === 0) { list.innerHTML = '<p class="placeholder-message">Nenhum agendamento para esta data.</p>'; } }, 300); } const dateStr = currentDate ? currentDate.toISOString().split('T')[0] : null; if (dateStr && monthlyAppointmentsData[dateStr]) { monthlyAppointmentsData[dateStr] = monthlyAppointmentsData[dateStr].filter(appt => String(appt.id) !== String(id)); } updateCalendarAndEvents(); } catch (error) { console.error(`calendar.js: Erro ao excluir agendamento ${id}:`, error); showNotification(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`, 'error'); }
}

async function updateAppointmentStatus(id, newStatus, listItemElement) {
    console.log(`>>> DEBUG: updateAppointmentStatus INICIADA para ID ${id}, Novo Status: ${newStatus}`); showNotification(`Atualizando status para ${newStatus}...`, 'info'); let currentAppointmentData;
    console.log(`>>> DEBUG: Passo 1 - Buscando dados atuais para ID ${id}...`);
    try { const responseGet = await fetch(`/api/agendamentos/${id}`, { credentials: 'include' }); console.log(`>>> DEBUG: Fetch GET /api/agendamentos/${id} - Status HTTP: ${responseGet.status}`); if (!responseGet.ok) throw new Error(`Erro HTTP ${responseGet.status} ao buscar dados: ${responseGet.statusText}`); const dataGet = await responseGet.json(); console.log(">>> DEBUG: Resposta JSON do GET /api/agendamentos:", dataGet); if (!dataGet.success || !dataGet.agendamento) throw new Error(dataGet.message || `Falha ao obter dados (success: ${dataGet.success})`); currentAppointmentData = dataGet.agendamento; console.log(`>>> DEBUG: Passo 1 SUCESSO - Dados atuais obtidos.`); }
    catch (error) { console.error(">>> ERRO CRÍTICO no Passo 1:", error); showNotification(`Falha grave: ${error.message}.`, 'error'); return; }
    console.log(">>> DEBUG: Passo 2 - Preparando dados para PUT..."); const dataToSend = { pacienteName: currentAppointmentData.paciente_nome, appointmentDate: currentAppointmentData.data_hora ? currentAppointmentData.data_hora.split('T')[0] : '', appointmentTime: currentAppointmentData.hora || (currentAppointmentData.data_hora ? currentAppointmentData.data_hora.split('T')[1].substring(0, 5) : ''), appointmentType: currentAppointmentData.tipo_consulta, professional: currentAppointmentData.profissional_id, status: newStatus, observacoes: currentAppointmentData.observacoes || '', appointmentValue: currentAppointmentData.valor }; if (!dataToSend.professional || !dataToSend.appointmentDate || !dataToSend.appointmentTime) { console.error(">>> ERRO no Passo 2:", dataToSend); showNotification("Erro interno: Dados inválidos.", "error"); return; } console.log(">>> DEBUG: Passo 2 SUCESSO - Dados para PUT:", dataToSend);
    let responsePut; let resultPut = { success: false, message: "Inicialização" }; console.log(`>>> DEBUG: Passo 3 - Enviando PUT para /api/agendamentos/${id}...`);
    try {
        responsePut = await fetch(`/api/agendamentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend), credentials: 'include' }); console.log(`>>> DEBUG: Resposta PUT recebida - Status HTTP: ${responsePut.status}`); const responseText = await responsePut.text(); console.log(">>> DEBUG: Corpo da resposta PUT (texto):", responseText); try { resultPut = JSON.parse(responseText); console.log(">>> DEBUG: Corpo da resposta PUT (JSON parseado):", resultPut); } catch (parseError) { console.error(">>> ERRO ao parsear JSON da resposta PUT:", parseError); resultPut = { success: responsePut.ok, message: responseText || `Erro ${responsePut.status}, resposta não JSON.` }; }
        console.log(`>>> DEBUG: Verificando SUCESSO APENAS PELO HTTP STATUS: responsePut.ok=${responsePut.ok}`); if (!responsePut.ok) { console.error(">>> ERRO no Passo 3: PUT falhou (HTTP Status não OK)."); throw new Error(resultPut.message || `Erro HTTP ${responsePut.status} ao atualizar status.`); }
        console.log(">>> DEBUG: Passo 3 QUASE SUCESSO (HTTP OK) - Mensagem backend:", resultPut.message); showNotification(resultPut.message || 'Status atualizado (HTTP OK)!', resultPut.success ? 'success' : 'info');
        console.log(">>> DEBUG: Atualizando UI do agendamento..."); const statusElement = listItemElement.querySelector('.appointment-status'); if (statusElement) { statusElement.textContent = newStatus; let statusClass = 'status-default'; switch (newStatus.toLowerCase()) { case 'pendente': statusClass = 'status-pending'; break; case 'confirmado': statusClass = 'status-confirmed'; break; case 'cancelado': statusClass = 'status-cancelled'; break; case 'realizado': statusClass = 'status-done'; break; case 'no show': statusClass = 'status-noshow'; break; } statusElement.className = 'appointment-status'; statusElement.classList.add(statusClass); } else { console.warn(">>> WARN: Elemento status não encontrado."); }
        console.log(">>> DEBUG: Atualizando cache local..."); const dateStrCache = dataToSend.appointmentDate; if (dateStrCache && monthlyAppointmentsData[dateStrCache]) { const index = monthlyAppointmentsData[dateStrCache].findIndex(appt => String(appt.id) === String(id)); if (index !== -1) { monthlyAppointmentsData[dateStrCache][index].status = newStatus; console.log(`>>> DEBUG: Cache atualizado ID ${id} data ${dateStrCache}`); } else { console.warn(`>>> WARN: ID ${id} não no cache data ${dateStrCache}`); } } else { console.warn(`>>> WARN: Cache não encontrado data ${dateStrCache}`); }
        console.log(">>> DEBUG: Desabilitando botões..."); const confirmBtn = listItemElement.querySelector('.confirm-btn'); const completeBtn = listItemElement.querySelector('.complete-btn'); const editBtn = listItemElement.querySelector('.edit-btn'); const deleteBtn = listItemElement.querySelector('.delete-btn'); const isCancelled = newStatus.toLowerCase() === 'cancelado'; const isDone = newStatus.toLowerCase() === 'realizado'; const isConfirmed = newStatus.toLowerCase() === 'confirmado'; if (confirmBtn) confirmBtn.disabled = isConfirmed || isDone || isCancelled; if (completeBtn) completeBtn.disabled = isDone || isCancelled; if (editBtn) editBtn.disabled = isDone || isCancelled; if (deleteBtn) deleteBtn.disabled = isDone;
        console.log(`>>> DEBUG: Verificando condição transação: newStatus === 'Realizado'?`); console.log(`>>> DEBUG: Valor de newStatus: "${newStatus}"`);
        if (newStatus === 'Realizado') {
            console.log(">>> DEBUG: CONDIÇÃO ATENDIDA! Chamando createFinancialTransactionForAppointment...");
            createFinancialTransactionForAppointment(currentAppointmentData).then(() => console.log(`>>> DEBUG: createFinancialTransactionForAppointment finalizado (async).`)).catch(err => console.error(`>>> ERRO não capturado promessa createFinancial...:`, err));
        } else { console.log(">>> DEBUG: CONDIÇÃO NÃO ATENDIDA. Status não é 'Realizado'."); }
    } catch (error) { console.error(`>>> ERRO GRAVE em updateAppointmentStatus (PUT/check) ID ${id}:`, error); showNotification(`Erro ao atualizar status: ${error.message}`, 'error'); }
    console.log(`>>> DEBUG: updateAppointmentStatus FINALIZADA para ID ${id}.`);
}


async function createFinancialTransactionForAppointment(appointmentData) {
    console.log("--> [Transação] Iniciando createFinancialTransactionForAppointment para ID:", appointmentData?.id); if (!appointmentData || !appointmentData.id) { console.error("--> [Transação] ERRO: Dados inválidos."); return; }
    console.log("--> [Transação] Passo 1: Extraindo dados..."); const appointmentId = appointmentData.id; const appointmentValue = appointmentData.valor; const appointmentDate = appointmentData.data_hora ? appointmentData.data_hora.split('T')[0] : (appointmentData.data ? appointmentData.data.split('T')[0] : null); const professionalName = appointmentData.profissional_nome || ''; const patientName = appointmentData.paciente_nome || 'Cliente'; const appointmentType = appointmentData.tipo_consulta || 'Consulta'; console.log(`--> [Transação] Dados extraídos: ID=${appointmentId}, Valor=${appointmentValue}, Data=${appointmentDate}, Prof=${professionalName}, Pac=${patientName}, Tipo=${appointmentType}`);
    console.log("--> [Transação] Passo 2: Validando valor..."); let valorFinal = null; if (appointmentValue !== undefined && appointmentValue !== null) { valorFinal = parseFloat(appointmentValue); if (isNaN(valorFinal) || valorFinal <= 0) { const msg = `Valor ID ${appointmentId} inválido (Gs. ${appointmentValue}). Transação NÃO criada.`; console.warn(`--> [Transação] WARN: ${msg}`); showNotification(msg, 'warning'); return; } console.log(`--> [Transação] Valor validado: ${valorFinal}`); } else { const msg = `Agendamento ID ${appointmentId} sem valor. Transação NÃO criada.`; console.warn(`--> [Transação] WARN: ${msg}`); showNotification(msg, 'warning'); return; }
    console.log("--> [Transação] Passo 3: Validando data..."); if (!appointmentDate) { const msg = `Erro: Data inválida agendamento ${appointmentId}. Transação NÃO criada.`; console.error(`--> [Transação] ERRO: ${msg}`, appointmentData); showNotification(msg, 'error'); return; } console.log(`--> [Transação] Data validada: ${appointmentDate}`);
    console.log("--> [Transação] Passo 4: Determinando categoria..."); let categoriaTransacao = 'Outros Procedimentos'; const nomeProfissionalLower = professionalName.toLowerCase().trim(); if (nomeProfissionalLower === 'fer' || nomeProfissionalLower === 'maria eduarda') { categoriaTransacao = 'Corporal'; } else if (nomeProfissionalLower === 'joão pedro' || nomeProfissionalLower === 'joao pedro') { categoriaTransacao = 'Facial'; } console.log(`--> [Transação] Categoria definida: ${categoriaTransacao} (Prof: '${professionalName}')`);
    console.log("--> [Transação] Passo 5: Montando payload..."); const transactionPayload = { data: appointmentDate, descricao: `Consulta Realizada - ${appointmentType} com ${patientName}`, categoria: categoriaTransacao, tipo: 'Ingreso', valor: valorFinal }; console.log("--> [Transação] Payload final (descrição alterada):", transactionPayload); // Descrição ajustada
    console.log("--> [Transação] Passo 6: Enviando POST para /api/transacoes..."); try { const response = await fetch('/api/transacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transactionPayload), credentials: 'include' }); console.log(`--> [Transação] Resposta POST recebida - Status HTTP: ${response.status}`); const responseText = await response.text(); console.log("--> [Transação] Corpo da resposta POST (texto):", responseText); let result = { success: false, message: "Inicialização" }; try { result = JSON.parse(responseText); console.log("--> [Transação] Corpo da resposta POST (JSON parseado):", result); } catch (parseError) { console.error("--> [Transação] ERRO parsear JSON:", parseError); result = { success: response.ok, message: responseText || `Erro ${response.status}, resposta não JSON.` }; } console.log(`--> [Transação] Verificando sucesso POST: response.ok=${response.ok}, result.success=${result.success}`); if (!response.ok || result.success === false) { console.error("--> [Transação] ERRO Passo 6: POST falhou ou success:false."); throw new Error(result.message || `Erro ${response.status} ao criar registro.`); } console.log("--> [Transação] SUCESSO! Registro financeiro criado Ag. ID:", appointmentId, result); showNotification(`Entrada Gs. ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} registrada em '${categoriaTransacao}'.`, 'success'); } catch (error) { console.error(`--> [Transação] ERRO GRAVE POST Ag. ID ${appointmentId}:`, error); showNotification(`Falha registro financeiro: ${error.message}.`, 'error'); } console.log("--> [Transação] createFinancialTransactionForAppointment FINALIZADA ID:", appointmentId);
}

function replaceListener(element, eventType, handler) {
    if (!element || !element.parentNode) { console.warn(`replaceListener: Elemento ou pai não encontrado (${eventType}).`); return element; }
    try { const newElement = element.cloneNode(true); element.parentNode.replaceChild(newElement, element); newElement.addEventListener(eventType, handler); console.log(`>>> DEBUG: Listener ${eventType} substituído em`, newElement); return newElement; }
    catch (error) { console.error(`Erro ao substituir listener com cloneNode (${eventType}):`, error, element); try { element.removeEventListener(eventType, handler); } catch (e) { } element.addEventListener(eventType, handler); return element; }
}

function getFormattedDate(date) {
    if (!(date instanceof Date) || isNaN(date)) { console.error("getFormattedDate: Input inválido:", date); return null; }
    const year = date.getUTCFullYear(); const month = String(date.getUTCMonth() + 1).padStart(2, '0'); const day = String(date.getUTCDate()).padStart(2, '0'); return `${year}-${month}-${day}`;
}


console.log("calendar.js carregado (v FINAL TOTALMENTE INTEGRADA)."); // Mensagem final