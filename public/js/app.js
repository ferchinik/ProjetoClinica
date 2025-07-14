import { navigateTo, initNavigation } from './navigation.js';
import { showNotification } from './notification.js';
import { loadInitialComponents } from './component-loader.js';
import { initThemeSwitcher } from './theme-switcher.js';
import { initEstoque, initEditarProduto } from './estoque.js';
import { initNovoProduto } from './novo-produto.js';
import { initClientForm } from './forms/client-form.js';
import { initClientesList } from './clientes.js';
import { initFinanceiro } from './financeiro.js';
import { initTransactionForm } from './novo-registro-financeiro.js';
import { initFinanceiroEditForm } from './financeiro-editar.js';
import { initLembretes } from './forms/lembretes.js';
import { initCalendar } from './calendar.js';
import { initNuevaCitaForm } from './forms/nueva-cita.js';
import { initEditarCitaForm } from './forms/editar-cita.js';
import { initDiaAgendamentos } from './forms/dia-agendamentos.js';
import { initEditarClienteForm } from './forms/editar-cliente.js';
import { initRelatoriosPage } from './forms/relatorios.js';
import { initNovaMedidaForm } from './forms/nova-medida.js';
import { initProntuarios } from './forms/prontuarios.js';
import { initAnamneseForm } from './forms/anamnese-form.js';

let dashboardChartInstance = null;
let inventoryChartInstance = null;
let currentClientDetailId = null;
let todaysBirthdayClientsData = [];

function formatDateToDisplayApp(dateInput) {
    if (!dateInput) return '--/--/----';
    try {
        let dateObj;
        if (typeof dateInput === 'string') {
            dateObj = new Date(dateInput.includes('T') ? dateInput : dateInput + 'T00:00:00Z');
        } else if (dateInput instanceof Date) {
            dateObj = dateInput;
        } else {
            return '--/--/----';
        }
        if (isNaN(dateObj.getTime())) {
            if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                const [year, month, day] = dateInput.split('-');
                return `${day}/${month}/${year}`;
            }
            return '--/--/----';
        }
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const year = dateObj.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Erro ao formatar data em app.js:", dateInput, e);
        return '--/--/----';
    }
}

const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Gs. 0';
    return num.toLocaleString('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

function createDashboardAppointmentElement(appointment) {
    const div = document.createElement('div');
    div.className = 'appointment';
    const time = appointment.hora_formatada || (appointment.data_hora_iso ? new Date(appointment.data_hora_iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--');
    const status = appointment.status || '?';
    let statusClass = 'pending';
    switch (status.toLowerCase()) {
        case 'confirmado': statusClass = 'confirmed'; break;
        case 'cancelado': statusClass = 'cancelled'; break;
        case 'realizado': statusClass = 'done'; break;
        case 'no show': statusClass = 'noshow'; break;
    }
    div.innerHTML = `
        <div class="time">${time}</div>
        <div class="details">
            <h4>${appointment.paciente_nome || '?'}</h4>
            <p>${appointment.tipo_consulta || '?'}</p>
            ${appointment.profissional_nome ? `<p style="font-size: 0.8em; color: var(--text-light);">Prof: ${appointment.profissional_nome}</p>` : ''}
        </div>
        <div class="status ${statusClass}">${status}</div>
    `;
    return div;
}

async function loadTodaysAppointments() {
    const container = document.getElementById('dashboard-appointments-container');
    const dateBadge = document.getElementById('dashboard-today-date');
    if (!container) return;
    container.innerHTML = '<p class="loading-message">Carregando citas de hoje...</p>';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (dateBadge) {
        try { dateBadge.textContent = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }
        catch (e) { dateBadge.textContent = todayStr; }
    }
    try {
        const response = await fetch(`/api/agendamentos?date=${todayStr}`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `Erro ${response.status}`);
        if (data.success && Array.isArray(data.appointments)) {
            container.innerHTML = '';
            if (data.appointments.length === 0) {
                container.innerHTML = '<p class="placeholder-message">Nenhuma consulta agendada para hoje.</p>';
            } else {
                data.appointments.sort((a, b) => (a.hora_formatada || a.data_hora_iso || '').localeCompare(b.hora_formatada || b.data_hora_iso || ''));
                data.appointments.forEach(app => container.appendChild(createDashboardAppointmentElement(app)));
            }
        } else {
            throw new Error(data.message || "Falha ao carregar lista de agendamentos.");
        }
    } catch (error) {
        console.error("Erro ao carregar agendamentos de hoje:", error);
        container.innerHTML = `<p class="error-message">Erro ao carregar citas: ${error.message}</p>`;
    }
}

function createOrUpdateRevenueChart(monthlyData = []) {
    const canvas = document.getElementById('dashboard-revenue-chart');
    const loadingMessage = document.getElementById('chart-loading-message');
    const errorMessage = document.getElementById('chart-error-message');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    const monthLabelsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = monthlyData.map(item => (typeof item.month === 'number' && item.month >= 1 && item.month <= 12) ? monthLabelsEs[item.month - 1] : '?');
    const dataValues = monthlyData.map(item => item.ingresos || 0);
    if (dashboardChartInstance) dashboardChartInstance.destroy();
    try {
        dashboardChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos Mensuales (Gs.)',
                    data: dataValues,
                    backgroundColor: 'rgba(153, 205, 133, 0.7)',
                    borderColor: 'rgba(153, 205, 133, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 'flex',
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        left: 5,
                        right: 10,
                        bottom: 5
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'start'
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label || ''}: ${formatCurrency(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: val => formatCurrency(val)
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            offset: true
                        }
                    }
                }
            }
        });
    } catch (chartError) {
        console.error("Erro ao criar gráfico de receita:", chartError);
        if (errorMessage) { errorMessage.textContent = 'Erro ao gerar gráfico.'; errorMessage.style.display = 'block'; }
    }
}

async function loadFinancialSummary() {
    const todayEl = document.getElementById('summary-today');
    const weekEl = document.getElementById('summary-week');
    const monthEl = document.getElementById('summary-month');
    const chartLoadingMsg = document.getElementById('chart-loading-message');
    const chartErrorMsg = document.getElementById('chart-error-message');
    if (todayEl) todayEl.textContent = '...';
    if (weekEl) weekEl.textContent = '...';
    if (monthEl) monthEl.textContent = '...';
    if (chartLoadingMsg) chartLoadingMsg.style.display = 'block';
    if (chartErrorMsg) chartErrorMsg.style.display = 'none';
    try {
        const response = await fetch('/api/dashboard/financial-summary', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || `Erro ${response.status}`);
        if (data.summary) {
            if (todayEl) todayEl.textContent = formatCurrency(data.summary.today);
            if (weekEl) weekEl.textContent = formatCurrency(data.summary.week);
            if (monthEl) monthEl.textContent = formatCurrency(data.summary.month);
        }
        createOrUpdateRevenueChart(data.chartData || []);
    } catch (error) {
        console.error("Erro ao carregar resumo financeiro:", error);
        showNotification(`Erro no resumo financeiro: ${error.message}`, 'error');
        if (todayEl) todayEl.textContent = 'Erro';
        if (weekEl) weekEl.textContent = 'Erro';
        if (monthEl) monthEl.textContent = 'Erro';
        if (chartLoadingMsg) chartLoadingMsg.style.display = 'none';
        if (chartErrorMsg) { chartErrorMsg.textContent = 'Erro ao carregar dados.'; chartErrorMsg.style.display = 'block'; }
        createOrUpdateRevenueChart([]);
    }
}

function renderCriticalStockList(products) {
    const listElement = document.getElementById('critical-stock-list');
    if (!listElement) return;
    listElement.innerHTML = '';
    if (!Array.isArray(products)) { listElement.innerHTML = '<li class="error-message">Erro ao carregar lista.</li>'; return; }
    if (products.length === 0) { listElement.innerHTML = '<li class="placeholder-message">Nenhum produto com estoque crítico.</li>'; return; }
    products.forEach(p => {
        const li = document.createElement('li');
        const stock = parseInt(p.estoque, 10);
        const stockText = isNaN(stock) ? '?' : stock;
        let stockClass = stock <= 0 ? 'critical' : (stock <= 10 ? 'warning' : '');
        li.innerHTML = `<span class="product-name">${p.titulo || '?'}</span> <span class="stock-level ${stockClass}">${stockText} un.</span>`;
        li.style.cursor = 'pointer'; li.title = 'Ir para Inventário';
        li.onclick = () => navigateTo('estoque');
        listElement.appendChild(li);
    });
}

function createOrUpdateInventoryChart(statusCounts) {
    const canvas = document.getElementById('dashboard-inventory-chart');
    const loadingMessage = document.getElementById('inventory-chart-loading-message');
    const errorMessage = document.getElementById('inventory-chart-error-message');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (inventoryChartInstance) inventoryChartInstance.destroy();
    const counts = statusCounts || {};
    const critical = counts.critical ?? 0; const low = counts.low ?? 0;
    const normal = counts.normal ?? 0; const optimal = counts.optimal ?? 0;
    const total = critical + low + normal + optimal;
    if (total === 0) {
        const msg = Object.keys(counts).length > 0 ? 'Nenhum dado de inventário para exibir no gráfico.' : 'Nenhum produto cadastrado.';
        if (errorMessage) { errorMessage.textContent = msg; errorMessage.style.display = 'block'; }
        try { ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) { }
        inventoryChartInstance = null; return;
    }
    const labels = ['Crítico', 'Baixo', 'Normal', 'Ótimo'];
    const dataValues = [critical, low, normal, optimal];
    const bgColors = ['rgba(217, 83, 79, 0.8)', 'rgba(240, 173, 78, 0.8)', 'rgba(74, 144, 226, 0.8)', 'rgba(153, 205, 133, 0.8)'];
    const bdColors = ['rgba(217, 83, 79, 1)', 'rgba(240, 173, 78, 1)', 'rgba(74, 144, 226, 1)', 'rgba(153, 205, 133, 1)'];
    try {
        inventoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Status do Inventário', data: dataValues, backgroundColor: bgColors,
                    borderColor: bdColors, borderWidth: 1, hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%',
                plugins: {
                    legend: { position: 'right', labels: { padding: 15, usePointStyle: true } },
                    title: { display: false },
                    tooltip: { callbacks: { label: ctxLabel => `${ctxLabel.label || ''}: ${ctxLabel.parsed || 0} (${total > 0 ? ((ctxLabel.parsed / total) * 100).toFixed(1) + '%' : '0%'})` } }
                }
            }
        });
    } catch (chartError) {
        console.error("Erro ao criar gráfico de inventário:", chartError);
        if (errorMessage) { errorMessage.textContent = 'Erro ao gerar gráfico.'; errorMessage.style.display = 'block'; }
    }
}

async function loadInventorySummary() {
    const listContainer = document.getElementById('critical-stock-list');
    const chartLoadingMsg = document.getElementById('inventory-chart-loading-message');
    const chartErrorMsg = document.getElementById('inventory-chart-error-message');
    if (listContainer) listContainer.innerHTML = '<p class="loading-message">Carregando produtos críticos...</p>';
    if (chartLoadingMsg) chartLoadingMsg.style.display = 'block';
    if (chartErrorMsg) chartErrorMsg.style.display = 'none';
    try {
        const response = await fetch('/api/dashboard/inventory-summary', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || `Erro ${response.status}`);
        renderCriticalStockList(data.criticalList || []);
        createOrUpdateInventoryChart(data.statusCounts || null);
    } catch (error) {
        console.error("Erro ao carregar resumo do inventário:", error);
        showNotification(`Erro no inventário: ${error.message}`, 'error');
        if (listContainer) listContainer.innerHTML = '<li class="error-message">Erro ao carregar produtos.</li>';
        if (chartLoadingMsg) chartLoadingMsg.style.display = 'none';
        if (chartErrorMsg) { chartErrorMsg.textContent = 'Erro ao carregar dados.'; chartErrorMsg.style.display = 'block'; }
        createOrUpdateInventoryChart(null);
    } finally {
        const listLoadingPlaceholder = listContainer?.querySelector('.loading-message');
        if (listLoadingPlaceholder) listLoadingPlaceholder.remove();
    }
}

function createBirthdayItemElement(client, isUpcoming = false) {
    const div = document.createElement('div');
    div.className = 'birthday-item';
    div.dataset.clientId = client.id;
    const avatarUrl = client.foto_perfil ? `/${client.foto_perfil.replace(/\\/g, '/')}` : 'img/users/default-avatar.png';
    const nome = client.nome_completo || 'Cliente?';
    let birthdayDateInfo = '';

    if (client.data_nascimento && isUpcoming) {
        try {
            const birthDate = new Date(client.data_nascimento);
            if (!isNaN(birthDate.getTime())) {
                const day = birthDate.getUTCDate();
                const month = birthDate.getUTCMonth();
                const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                if (month >= 0 && month < 12) {
                    birthdayDateInfo = `${day} ${monthNamesShort[month]}`;
                } else {
                    console.warn("Mês inválido após parse:", month, "para data:", client.data_nascimento);
                }
            } else {
                console.warn("Data de nascimento inválida para parse:", client.data_nascimento);
            }
        } catch (e) {
            console.warn("Erro ao processar data de nascimento:", client.data_nascimento, e);
        }
    }
    div.innerHTML = `
        <div class="birthday-avatar">
            <img src="${avatarUrl}" alt="${nome}" onerror="this.onerror=null; this.src='img/users/default-avatar.png';">
            ${!isUpcoming ? '<div class="birthday-badge"><i class="fas fa-birthday-cake"></i></div>' : ''}
        </div>
        <div class="birthday-info">
            <h4>${nome}</h4>
            ${isUpcoming && birthdayDateInfo ? `<p style="font-size: 0.8em; color: var(--text-light);"><i class="fas fa-calendar-day"></i> ${birthdayDateInfo}</p>` : ''}
        </div>
        <div class="birthday-actions" style="display: none;">
            <button class="btn-icon" title="Enviar Mensaje"><i class="fas fa-envelope"></i></button>
            <button class="btn-icon view-client-details-btn" title="Ver Cliente" data-page="cliente-detalhes" data-client-id="${client.id}"><i class="fas fa-eye"></i></button>
        </div>`;

    const viewButton = div.querySelector('.view-client-details-btn');
    if (viewButton) {
        viewButton.onclick = (e) => {
            e.stopPropagation();
            const clientIdFromButton = e.currentTarget.dataset.clientId;
            const pageTarget = e.currentTarget.dataset.page;
            if (clientIdFromButton && pageTarget) {
                sessionStorage.setItem('selectedClientId', clientIdFromButton);
                navigateTo(pageTarget);
            }
        };
    }
    return div;
}

function renderTodaysBirthdays(birthdays) {
    const ul = document.getElementById('todays-birthdays-list');
    const footer = document.getElementById('today-birthday-footer');
    if (!ul) { console.error("Elemento #todays-birthdays-list não encontrado."); return; }
    ul.innerHTML = '';
    if (footer) footer.style.display = 'none';

    todaysBirthdayClientsData = [];

    if (!Array.isArray(birthdays) || birthdays.length === 0) {
        ul.innerHTML = `<p class="placeholder-message">Nenhum cumpleaños hoy.</p>`;
    } else {
        todaysBirthdayClientsData = birthdays.filter(client => client && typeof client === 'object' && client.telefone && client.telefone.trim() !== '');

        if (birthdays.length > 0) {
             birthdays.forEach(client => {
                 if (client && typeof client === 'object') {
                     ul.appendChild(createBirthdayItemElement(client, false));
                 }
             });
        }

        if (todaysBirthdayClientsData.length > 0) {
            if (footer) footer.style.display = 'block';
        } else if (birthdays.length > 0) {
            ul.insertAdjacentHTML('beforeend', `<p class="placeholder-message" style="font-size:0.8em; margin-top:10px;">(Nenhum com telefone para WhatsApp)</p>`);
        } else {
             ul.innerHTML = `<p class="placeholder-message">Nenhum cumpleaños hoy.</p>`;
        }
    }
}

function renderUpcomingBirthdays(birthdays) {
    const ul = document.getElementById('upcoming-birthdays-list');
    const footer = document.getElementById('upcoming-birthday-footer');
    if (!ul) { console.error("Elemento #upcoming-birthdays-list não encontrado."); return; }
    ul.innerHTML = ''; if (footer) footer.style.display = 'none';
    if (!Array.isArray(birthdays) || birthdays.length === 0) {
        ul.innerHTML = `<p class="placeholder-message">Nenhum cumpleaños próximo.</p>`;
    } else {
        birthdays.forEach(client => {
            if (client && typeof client === 'object') { ul.appendChild(createBirthdayItemElement(client, true)); }
            else { console.warn("Item de aniversário inválido (upcoming):", client); }
        });
        if (footer && birthdays.length > 0) footer.style.display = 'block';
    }
}

async function loadBirthdaySummary() {
    console.log("%c[BIRTHDAY] loadBirthdaySummary: Função INICIADA.", "color: limegreen; font-weight: bold;");
    const todayList = document.getElementById('todays-birthdays-list');
    const upcomingList = document.getElementById('upcoming-birthdays-list');

    if (!todayList || !upcomingList) {
        console.error("[BIRTHDAY] CRÍTICO: Elementos da lista de aniversariantes não encontrados!");
        showNotification("Erro: Elementos de aniversariantes ausentes.", "error");
        return;
    }
    const todayBadge = document.getElementById('today-birthday-date');
    if (todayBadge) {
        try { todayBadge.textContent = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }
        catch (e) { todayBadge.textContent = new Date().toISOString().substring(5, 10); }
    }
    if (todayList.innerHTML.trim() === '' || !todayList.querySelector('.loading-message')) {
        todayList.innerHTML = '<p class="loading-message">Carregando...</p>';
    }
    if (upcomingList.innerHTML.trim() === '' || !upcomingList.querySelector('.loading-message')) {
        upcomingList.innerHTML = '<p class="loading-message">Carregando...</p>';
    }
    try {
        const response = await fetch('/api/dashboard/birthdays', { credentials: 'include' });
        const responseText = await response.text();
        let data;
        try { data = JSON.parse(responseText); }
        catch (jsonError) { throw new Error(`Resposta da API não é JSON válido. Status: ${response.status}. Resposta: ${responseText.substring(0, 150)}...`); }
        if (!response.ok || !data.success) { throw new Error(data.message || `Erro da API: Status ${response.status}`); }

        renderTodaysBirthdays(data.today || []);
        renderUpcomingBirthdays(data.upcoming || []);

    } catch (error) {
        console.error("[BIRTHDAY] loadBirthdaySummary: Erro:", error.message, error.stack);
        showNotification(`Erro nos aniversários: ${error.message}`, 'error');
        if (todayList) todayList.innerHTML = `<p class="error-message">Erro ao carregar.</p>`;
        if (upcomingList) upcomingList.innerHTML = `<p class="error-message">Erro ao carregar.</p>`;
    }
    console.log("%c[BIRTHDAY] loadBirthdaySummary: Função FINALIZADA.", "color: limegreen; font-weight: bold;");
}

function formatPhoneNumberForWhatsApp(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') return null;
    let cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.startsWith('55') && cleaned.charAt(2) === '0') {
        cleaned = '55' + cleaned.substring(3);
    } else if (cleaned.startsWith('595') && cleaned.charAt(3) === '0') {
        cleaned = '595' + cleaned.substring(4);
    }
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    if (!cleaned.startsWith('55') && !cleaned.startsWith('595')) {
        if (cleaned.length === 11 || cleaned.length === 10) {
            cleaned = '55' + cleaned;
        } else if (cleaned.length === 9) {
            cleaned = '595' + cleaned;
        }
    }
    if (
        (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) ||
        (cleaned.startsWith('595') && cleaned.length === 12)
    ) {
        console.log(`[WHATSAPP Formatting] Número formatado com sucesso: ${phoneNumber} -> ${cleaned}`);
        return cleaned;
    }
    console.warn(`[WHATSAPP Formatting] Número não corresponde aos padrões BR/PY: ${phoneNumber} -> ${cleaned}`);
    return null;
}

function handleSendCongratsWhatsApp() {
    console.log("[WHATSAPP] Botão 'Enviar Felicitações' clicado.");
    console.log("[WHATSAPP] Aniversariantes de hoje com telefone (antes de formatar):", todaysBirthdayClientsData);

    if (!todaysBirthdayClientsData || todaysBirthdayClientsData.length === 0) {
        showNotification("Nenhum aniversariante com telefone cadastrado para enviar mensagem.", "info");
        return;
    }
    let clientToSend = null;
    let formattedPhoneNumber = null;
    for (const client of todaysBirthdayClientsData) {
        const tempFormattedNumber = formatPhoneNumberForWhatsApp(client.telefone);
        if (tempFormattedNumber) {
            clientToSend = client;
            formattedPhoneNumber = tempFormattedNumber;
            break; 
        } else {
            console.warn(`[WHATSAPP] Telefone de ${client.nome_completo} (${client.telefone}) não pôde ser formatado.`);
        }
    }
    if (!clientToSend || !formattedPhoneNumber) {
        showNotification("Nenhum aniversariante com número de telefone válido encontrado para enviar via WhatsApp.", "warning", 7000);
        return;
    }
    const clientName = clientToSend.nome_completo || "Cliente";
    const textoDaMensagem = `Feliz Aniversário, ${clientName.split(' ')[0]}!\n\nHoje é o seu dia, e nós da Clínica Estética não poderíamos deixar de celebrar com você!\n\nDesejamos que este novo ciclo venha recheado de saúde, amor, paz e muitos momentos de autocuidado. Que você continue iluminando o mundo com sua presença única!\n\nConte sempre com a gente para realçar ainda mais a sua beleza e bem-estar.\n\nCom carinho,\nEquipe Clínica Estética`;
    const message = encodeURIComponent(textoDaMensagem);
    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${message}`;
    console.log(`[WHATSAPP] Abrindo URL: ${whatsappUrl}`);
    window.open(whatsappUrl, '_blank');
    const remainingClientsWithPhone = todaysBirthdayClientsData.filter(c => c.id !== clientToSend.id && formatPhoneNumberForWhatsApp(c.telefone)).length;
    if (remainingClientsWithPhone > 0) {
        showNotification(`WhatsApp aberto para ${clientName}. Existem mais ${remainingClientsWithPhone} aniversariante(s) com telefone hoje.`, "info", 10000);
    } else if (todaysBirthdayClientsData.length > 1 && remainingClientsWithPhone === 0) {
        showNotification(`WhatsApp aberto para ${clientName}. Outros aniversariantes não possuem telefone formatável.`, "info", 10000);
    } else {
        showNotification(`WhatsApp aberto para ${clientName}.`, "success");
    }
}

function initDashboard() {
    console.log("[DASHBOARD] initDashboard: INICIANDO.");
    loadTodaysAppointments();
    loadFinancialSummary();
    loadInventorySummary();
    loadBirthdaySummary();
    const userName = sessionStorage.getItem('userName');
    const userNameEl = document.getElementById('user-name-display');
    if (userName && userNameEl) userNameEl.textContent = userName;
    const sendCongratsBtn = document.getElementById('today-birthday-footer')?.querySelector('button');
    if (sendCongratsBtn) {
        const newSendCongratsBtn = sendCongratsBtn.cloneNode(true);
        sendCongratsBtn.parentNode.replaceChild(newSendCongratsBtn, sendCongratsBtn);
        newSendCongratsBtn.addEventListener('click', handleSendCongratsWhatsApp);
        console.log("[DASHBOARD] Listener de 'Enviar Felicitações WhatsApp' adicionado.");
    } else {
        console.warn("[DASHBOARD] Botão de Enviar Felicitações no footer não encontrado.");
    }
    console.log("[DASHBOARD] initDashboard: COMPLETO.");
}

function renderClientPhotos(photos = []) {
    const container = document.getElementById('detalhes-fotos');
    const template = document.getElementById('photo-pair-template');
    const addButton = document.getElementById('detalhes-agregar-fotos-btn');

    if (!container || !template) {
        if (container) container.innerHTML = '<p class="error-message">Erro (template de mídias ausente).</p>';
        if (addButton) addButton.disabled = true;
        return;
    }
    container.innerHTML = ''; 

    if (!Array.isArray(photos) || photos.length === 0) {
        container.innerHTML = '<p class="placeholder-message">Nenhuma mídia Antes/Depois registrada.</p>';
    } else {
        photos.forEach(photo => {
            try {
                const clone = template.content.cloneNode(true);
                const itemElement = clone.querySelector('.before-after-item');
                itemElement.dataset.photoId = photo.id; 

                clone.querySelector('.photo-description').textContent = photo.descricao || `Registrado em: ${formatDateToDisplayApp(photo.data_registro)}`;

                const mediaContainerAntes = clone.querySelector('.media-container.antes');
                const mediaContainerDepois = clone.querySelector('.media-container.depois');

                const createMediaElement = (url, type, altText) => {
                    let mediaElement;
                    if (type === 'video') {
                        mediaElement = document.createElement('video');
                        mediaElement.style.maxWidth = '100%';
                        mediaElement.style.height = '150px';
                        mediaElement.style.objectFit = 'cover';
                        mediaElement.style.borderRadius = 'var(--radius)';
                        mediaElement.style.border = '1px solid var(--border-color)';
                        mediaElement.controls = true;
                        const sourceElement = document.createElement('source');
                        sourceElement.src = url;
                        const extension = url.split('.').pop().toLowerCase();
                        if (extension === 'mp4') sourceElement.type = 'video/mp4';
                        else if (extension === 'webm') sourceElement.type = 'video/webm';
                        else if (extension === 'ogv' || extension === 'ogg') sourceElement.type = 'video/ogg';
                        mediaElement.appendChild(sourceElement);
                        mediaElement.appendChild(document.createTextNode('Seu navegador não suporta o elemento de vídeo.'));
                    } else { 
                        mediaElement = document.createElement('img');
                        mediaElement.src = url;
                        mediaElement.alt = altText;
                        mediaElement.style.maxWidth = '100%';
                        mediaElement.style.height = '150px';
                        mediaElement.style.objectFit = 'cover';
                        mediaElement.style.borderRadius = 'var(--radius)';
                        mediaElement.style.border = '1px solid var(--border-color)';
                        mediaElement.onerror = () => { mediaElement.src = 'img/default.png'; mediaElement.onerror = null; };
                    }
                    const linkElement = document.createElement('a');
                    linkElement.href = url;
                    linkElement.target = '_blank';
                    linkElement.appendChild(mediaElement);
                    return linkElement;
                };

                if (mediaContainerAntes && photo.foto_antes_url) {
                    mediaContainerAntes.appendChild(
                        createMediaElement(photo.foto_antes_url, photo.media_type_antes, `Antes - ${photo.descricao || 'Mídia'}`)
                    );
                } else if (mediaContainerAntes) {
                    mediaContainerAntes.innerHTML += '<p style="font-size:0.8em; color:var(--text-secondary);">Sem mídia</p>';
                }

                if (mediaContainerDepois && photo.foto_depois_url) {
                    mediaContainerDepois.appendChild(
                        createMediaElement(photo.foto_depois_url, photo.media_type_depois, `Depois - ${photo.descricao || 'Mídia'}`)
                    );
                } else if (mediaContainerDepois) {
                     mediaContainerDepois.innerHTML += '<p style="font-size:0.8em; color:var(--text-secondary);">Sem mídia</p>';
                }
                container.appendChild(clone);
            } catch (renderError) {
                console.error("Erro ao renderizar par de mídias:", photo, renderError);
            }
        });
    }
    if (addButton) addButton.disabled = !currentClientDetailId;
}


async function loadAndRenderClientPhotos(clientIdToLoad) { 
    const container = document.getElementById('detalhes-fotos');
    const addButton = document.getElementById('detalhes-agregar-fotos-btn');
    if (!container) return; container.innerHTML = '<p class="loading-message">Carregando mídias...</p>'; if (addButton) addButton.disabled = true;
    if (!clientIdToLoad) { container.innerHTML = '<p class="error-message">ID Cliente inválido para mídias.</p>'; return; }
    try {
        const response = await fetch(`/api/clientes/${clientIdToLoad}/fotos`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message || `Erro ${response.status}`); }
        if(!data.success){ throw new Error(data.message || "Falha ao buscar dados de fotos da API."); }
        renderClientPhotos(data.photos || []);
    }
    catch (error) { console.error("[App-Photos] Erro ao carregar mídias:", error); container.innerHTML = `<p class="error-message">Falha ao carregar mídias: ${error.message}</p>`; if (addButton) addButton.disabled = true; }
}

function renderClientDetails(clientData = null) {
    const pageElement = document.getElementById('cliente-detalhes'); if (!pageElement) return; const hasData = clientData && typeof clientData === 'object' && clientData.id;
    const elements = { avatar: pageElement.querySelector('#detalhes-cliente-avatar'), nome: pageElement.querySelector('#detalhes-cliente-nome'), telefone: pageElement.querySelector('#detalhes-cliente-telefone'), email: pageElement.querySelector('#detalhes-cliente-email'), nascimento: pageElement.querySelector('#detalhes-cliente-nascimento'), endereco: pageElement.querySelector('#detalhes-cliente-endereco'), profissao: pageElement.querySelector('#detalhes-cliente-profissao'), documento: pageElement.querySelector('#detalhes-cliente-documento'), observacoes: pageElement.querySelector('#detalhes-cliente-observacoes'), primeiraVisita: pageElement.querySelector('#detalhes-stat-primeira-visita'), ultimaVisita: pageElement.querySelector('#detalhes-stat-ultima-visita'), totalCitas: pageElement.querySelector('#detalhes-stat-total-citas'), inversaoTotal: pageElement.querySelector('#detalhes-stat-inversao-total'), timelineContainer: pageElement.querySelector('#detalhes-timeline-procedimentos'), proximasCitasContainer: pageElement.querySelector('#detalhes-proximas-citas'), novaCitaBtn: pageElement.querySelector('#detalhes-nova-cita-btn'), editarBtn: pageElement.querySelector('#detalhes-editar-btn'), agendarNovaCitaBtn: pageElement.querySelector('#detalhes-agendar-nova-cita-btn'), agregarFotosBtn: pageElement.querySelector('#detalhes-agregar-fotos-btn') };
    if (elements.avatar) { const fotoUrl = hasData && clientData.foto_perfil ? `/${clientData.foto_perfil.replace(/\\/g, '/')}` : 'img/users/default-avatar.png'; elements.avatar.src = fotoUrl; elements.avatar.onerror = () => { elements.avatar.src = 'img/users/default-avatar.png'; elements.avatar.onerror = null; }; }
    if (elements.nome) elements.nome.textContent = hasData ? clientData.nome_completo : 'Carregando...';
    if (elements.telefone) elements.telefone.innerHTML = `<i class="fas fa-phone"></i> ${hasData ? clientData.telefone : '...'}`;
    if (elements.email) elements.email.innerHTML = `<i class="fas fa-envelope"></i> ${hasData ? clientData.email : '...'}`;
    if (elements.nascimento) elements.nascimento.innerHTML = `<i class="fas fa-calendar-day"></i> ${hasData ? formatDateToDisplayApp(clientData.data_nascimento) : '...'}`;
    if (elements.endereco) elements.endereco.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${hasData && clientData.endereco ? (clientData.endereco + (clientData.cidade ? `, ${clientData.cidade}` : '')) : '...'}`;
    if (elements.profissao) elements.profissao.innerHTML = `<i class="fas fa-briefcase"></i> ${hasData ? clientData.profissao : '...'}`;
    if (elements.documento) elements.documento.innerHTML = `<i class="fas fa-id-card"></i> ${hasData ? clientData.documento_identidade : '...'}`;
    if (elements.observacoes) elements.observacoes.textContent = hasData ? (clientData.observacoes || 'Nenhuma observação.') : '...';
    if (elements.primeiraVisita) elements.primeiraVisita.textContent = hasData ? formatDateToDisplayApp(clientData.data_cadastro) : '--/--/----';
    if (elements.ultimaVisita) elements.ultimaVisita.textContent = hasData ? formatDateToDisplayApp(clientData.ultima_visita) : '--/--/----';
    if (elements.totalCitas) elements.totalCitas.textContent = hasData ? (clientData.totalCitas || 0) : '0';
    if (elements.inversaoTotal) elements.inversaoTotal.textContent = hasData ? formatCurrency(clientData.inversionTotal) : 'Gs. 0';
    if (elements.timelineContainer) { elements.timelineContainer.innerHTML = ''; if (hasData && clientData.timeline && clientData.timeline.length > 0) { clientData.timeline.forEach(item => { const div = document.createElement('div'); div.className = 'timeline-item'; div.innerHTML = `<div class="timeline-date">${item.data_formatada} ${item.hora_formatada ? `às ${item.hora_formatada}` : ''}</div> <div class="timeline-content"> <h4>${item.procedimento || '?'}</h4> ${item.nome_profissional ? `<p><i class="fas fa-user-md"></i> Prof: ${item.nome_profissional}</p>` : ''} ${item.observacoes ? `<p>Obs: ${item.observacoes}</p>` : ''} ${item.tags && item.tags.length > 0 ? `<div class="tags">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''} </div>`; elements.timelineContainer.appendChild(div); }); } else if (hasData) { elements.timelineContainer.innerHTML = '<p class="placeholder-message">Nenhum procedimento realizado.</p>'; } else { elements.timelineContainer.innerHTML = '<p class="loading-message">Carregando histórico...</p>'; } }
    if (elements.proximasCitasContainer) { elements.proximasCitasContainer.innerHTML = ''; if (hasData && clientData.proximasCitas && clientData.proximasCitas.length > 0) { clientData.proximasCitas.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora)); clientData.proximasCitas.forEach(item => { const div = document.createElement('div'); div.className = 'appointment-item'; let dia = '--'; let mesAbrev = '???'; let horaFormatada = '--:--'; let statusClass = 'status-default'; const statusText = item.status || '?'; if (item.data_hora) { try { const dt = new Date(item.data_hora); if (!isNaN(dt.getTime())) { dia = String(dt.getUTCDate()).padStart(2, '0'); const monthIndex = dt.getUTCMonth(); const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']; mesAbrev = monthNamesShort[monthIndex]; horaFormatada = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); } } catch (e) { } } switch (statusText.toLowerCase()) { case 'pendente': statusClass = 'status-pending'; break; case 'confirmado': statusClass = 'status-confirmed'; break; } div.innerHTML = `<div class="appointment-date"> <span class="day">${dia}</span> <span class="month">${mesAbrev}</span> </div> <div class="appointment-details"> <h4>${item.procedimento || 'Cita'} às ${horaFormatada}</h4> ${item.nome_profissional ? `<p><i class="fas fa-user-md"></i> Profesional: ${item.nome_profissional}</p>` : ''} <span class="appointment-status ${statusClass}">${statusText}</span> </div>`; elements.proximasCitasContainer.appendChild(div); }); } else if (hasData) { elements.proximasCitasContainer.innerHTML = '<p class="placeholder-message">Nenhuma próxima cita agendada.</p>'; } else { elements.proximasCitasContainer.innerHTML = '<p class="loading-message">Carregando próximas citas...</p>'; } }
    const currentId = hasData ? clientData.id : '';
    if (elements.novaCitaBtn) { elements.novaCitaBtn.dataset.clientId = currentId; elements.novaCitaBtn.disabled = !hasData; }
    if (elements.editarBtn) { elements.editarBtn.dataset.clientId = currentId; elements.editarBtn.disabled = !hasData; }
    if (elements.agendarNovaCitaBtn) { elements.agendarNovaCitaBtn.dataset.clientId = currentId; elements.agendarNovaCitaBtn.disabled = !hasData; }
    if (elements.agregarFotosBtn) { elements.agregarFotosBtn.dataset.clientId = currentId; elements.agregarFotosBtn.disabled = !hasData; }
}

async function loadAndRenderClientMedidas(idDoClienteComoParametro) {
    const medidasContentDiv = document.getElementById('detalhes-medidas-content');
    if (!medidasContentDiv) {
        console.error("[App.js] Erro: Div de conteúdo de medidas não encontrada (#detalhes-medidas-content).");
        return;
    }
    console.log(`[App.js] loadAndRenderClientMedidas chamada com ID: ${idDoClienteComoParametro}`);
    medidasContentDiv.innerHTML = '<p class="loading-message">Carregando medidas...</p>';
    medidasContentDiv.dataset.loaded = "false";

    if (!idDoClienteComoParametro) {
        console.error("[App.js] Erro: ID do cliente (idDoClienteComoParametro) não fornecido para loadAndRenderClientMedidas.");
        medidasContentDiv.innerHTML = '<p class="placeholder-message">ID do cliente não fornecido para carregar medidas.</p>';
        medidasContentDiv.dataset.loaded = "error";
        return;
    }
    try {
        const response = await fetch(`/api/clientes/${idDoClienteComoParametro}/medidas`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message || `Erro ${response.status} ao buscar medidas.`); }
        if(!data.success){ throw new Error(data.message || "Falha ao buscar dados de medidas da API."); }
        medidasContentDiv.innerHTML = '';
        if (data.medidas && data.medidas.length > 0) {
            const template = document.getElementById('medida-item-template');
            if (!template) {
                medidasContentDiv.innerHTML = '<p class="error-message">Template de medida (#medida-item-template) não encontrado.</p>';
                console.error("[App.js] Erro: Template #medida-item-template não encontrado.");
                medidasContentDiv.dataset.loaded = "error";
                return;
            }
            data.medidas.forEach(medida => {
                const clone = template.content.cloneNode(true);
                const itemDiv = clone.querySelector('.medida-historico-item');
                if (itemDiv) itemDiv.dataset.medidaId = medida.id;
                const dataMedicaoDisplay = clone.querySelector('.data-medicao-display');
                if (dataMedicaoDisplay) dataMedicaoDisplay.textContent = formatDateToDisplayApp(medida.data_medicao);
                const camposMedida = ['peso_kg', 'altura_cm', 'imc', 'perc_gordura_corporal', 'massa_muscular_kg', 'circ_braco_d_cm', 'circ_braco_e_cm', 'circ_antebraco_d_cm', 'circ_antebraco_e_cm', 'circ_peitoral_cm', 'circ_abdomen_cm', 'circ_cintura_cm', 'circ_quadril_cm', 'circ_coxa_d_cm', 'circ_coxa_e_cm', 'circ_panturrilha_d_cm', 'circ_panturrilha_e_cm'];
                camposMedida.forEach(campo => {
                    const el = clone.querySelector(`.${campo}`);
                    if (el) el.textContent = medida[campo] !== null && medida[campo] !== undefined ? medida[campo] : '--';
                });
                const obsEl = clone.querySelector('.obs-texto');
                if (obsEl) obsEl.textContent = medida.observacoes || 'Nenhuma.';
                const deleteBtn = clone.querySelector('.delete-medida-btn');
                if (deleteBtn) {
                    deleteBtn.onclick = () => handleDeleteMedida(medida.id, idDoClienteComoParametro, itemDiv);
                }
                medidasContentDiv.appendChild(clone);
            });
            medidasContentDiv.dataset.loaded = "true";
        } else {
            medidasContentDiv.innerHTML = '<p class="placeholder-message">Nenhum registro de medidas encontrado.</p>';
            medidasContentDiv.dataset.loaded = "true";
        }
    }
    catch (error) {
        console.error("[App.js] Erro em loadAndRenderClientMedidas:", error);
        medidasContentDiv.innerHTML = `<p class="error-message">Falha ao carregar medidas: ${error.message}</p>`;
        medidasContentDiv.dataset.loaded = "error";
    }
}

async function handleDeleteMedida(medidaId, clienteIdParaRecarregar, itemDivElement) {
    if (!confirm(`Tem certeza que deseja excluir este registro de medida (ID: ${medidaId})?`)) return;
    showNotification("Excluindo registro de medida...", "info");
    try {
        const response = await fetch(`/api/medidas/${medidaId}`, { method: 'DELETE', credentials: 'include' });
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification(result.message || "Registro de medida excluído!", "success");
            if (itemDivElement && itemDivElement.parentNode) {
                itemDivElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                itemDivElement.style.opacity = '0';
                itemDivElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if (itemDivElement.parentNode) itemDivElement.remove();
                    const container = document.getElementById('detalhes-medidas-content');
                    if (container && !container.querySelector('.medida-historico-item')) {
                        container.innerHTML = '<p class="placeholder-message">Nenhum registro de medidas encontrado.</p>';
                    }
                }, 300);
            } else {
                if (clienteIdParaRecarregar) {
                    console.log("[App.js] handleDeleteMedida: itemDivElement não encontrado, recarregando medidas para cliente ID:", clienteIdParaRecarregar);
                    loadAndRenderClientMedidas(clienteIdParaRecarregar);
                }
            }
        } else {
            throw new Error(result.message || `Erro ${response.status}`);
        }
    }
    catch (error) {
        console.error("Erro ao excluir medida:", error);
        showNotification(`Erro ao excluir medida: ${error.message}`, "error");
    }
}

async function loadAndRenderClientAnamnese(clientId) {
    const anamneseContainer = document.getElementById('detalhes-anamnese-content');
    const editarAnamneseBtn = document.getElementById('detalhes-editar-anamnese-btn'); 
    if (!anamneseContainer) {
        console.error("[APP.JS] Container de anamnese #detalhes-anamnese-content não encontrado.");
        return;
    }
    console.log(`[App.js] loadAndRenderClientAnamnese chamada com ID: ${clientId}`);
    anamneseContainer.innerHTML = '<p class="loading-message">Carregando anamnese...</p>';
    anamneseContainer.dataset.loaded = "false";
    if (editarAnamneseBtn) editarAnamneseBtn.dataset.anamneseId = '';
    if (!clientId) {
        console.error("[APP.JS] Erro: ID do cliente não fornecido para loadAndRenderClientAnamnese.");
        anamneseContainer.innerHTML = '<p class="placeholder-message">ID do cliente não fornecido para carregar anamnese.</p>';
        anamneseContainer.dataset.loaded = "error";
        return;
    }
    try {
        const response = await fetch(`/api/clientes/${clientId}/anamneses`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Erro HTTP ${response.status} ao buscar anamnese.`);
        }
        if (data.success && data.anamneses && data.anamneses.length > 0) {
            const maisRecente = data.anamneses[0]; 
            anamneseContainer.innerHTML = `
                <div class="data-section">
                    <div class="data-row"><span class="data-label">Data:</span><span class="data-value">${formatDateToDisplayApp(maisRecente.data_anamnese)}</span></div>
                    <div class="data-row"><span class="data-label">Queixa Principal:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.queixa_principal || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Hist. Doença Atual:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.historico_doenca_atual || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Anteced. Pessoais:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.antecedentes_pessoais || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Alergias:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.alergias || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Medicamentos:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.medicamentos_em_uso || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Hábitos de Vida:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.habitos_vida || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Hábitos Nocivos:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.habitos_nocivos || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Anteced. Familiares:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.antecedentes_familiares || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Rotina Cuidados:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.rotina_cuidados_pele || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Proced. Anteriores:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.procedimentos_esteticos_anteriores || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Expectativas:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.expectativas_tratamento || 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Obs. Gerais:</span><span class="data-value" style="white-space: pre-wrap;">${maisRecente.observacoes_gerais || 'N/A'}</span></div>
                </div>
            `;
            if (editarAnamneseBtn) {
                editarAnamneseBtn.dataset.anamneseId = maisRecente.id;
            }
            anamneseContainer.dataset.loaded = "true";
        } else {
            anamneseContainer.innerHTML = '<p class="placeholder-message">Nenhuma anamnese registrada para este cliente.</p>';
            anamneseContainer.dataset.loaded = "true";
        }
    } catch (error) {
        console.error("[APP.JS] Erro ao carregar anamnese para detalhes:", error);
        anamneseContainer.innerHTML = `<p class="error-message">Falha ao carregar anamnese: ${error.message}</p>`;
        anamneseContainer.dataset.loaded = "error";
    }
}

async function loadAndRenderClientDetails(clientId) {
    const feedbackDiv = document.getElementById('cliente-detalhes-feedback');
    const gridContainer = document.querySelector('#cliente-detalhes .cliente-detalhes-grid');
    currentClientDetailId = clientId;

    if (!clientId || clientId === 'null' || clientId === 'undefined' || clientId.trim() === '') {
        if (feedbackDiv) feedbackDiv.innerHTML = '<p class="error-message">Erro: ID do cliente inválido.</p>';
        renderClientDetails(null); renderClientPhotos([]);
        const medidasContentDiv = document.getElementById('detalhes-medidas-content');
        if (medidasContentDiv) {
            medidasContentDiv.innerHTML = '<p class="placeholder-message">ID do cliente inválido.</p>';
            medidasContentDiv.style.display = 'none';
            document.getElementById('toggle-medidas-btn')?.classList.remove('active');
            const toggleMedidasIcon = document.getElementById('toggle-medidas-btn')?.querySelector('i');
            if (toggleMedidasIcon) toggleMedidasIcon.className = 'fas fa-eye';
             const toggleMedidasText = document.getElementById('toggle-medidas-btn')?.querySelector('span');
            if (toggleMedidasText) toggleMedidasText.textContent = ' Ver Histórico';
        }
        const anamneseContentDiv = document.getElementById('detalhes-anamnese-content');
        if (anamneseContentDiv) {
            anamneseContentDiv.innerHTML = '<p class="placeholder-message">ID do cliente inválido.</p>';
            anamneseContentDiv.style.display = 'none';
            document.getElementById('toggle-anamnese-btn')?.classList.remove('active');
            const toggleAnamneseIcon = document.getElementById('toggle-anamnese-btn')?.querySelector('i');
            if (toggleAnamneseIcon) toggleAnamneseIcon.className = 'fas fa-eye';
            const toggleAnamneseText = document.getElementById('toggle-anamnese-btn')?.querySelector('span');
            if (toggleAnamneseText) toggleAnamneseText.textContent = ' Ver Atual';
        }
        return;
    }
    document.getElementById('cliente-detalhes').dataset.clientId = clientId;
    if (feedbackDiv) feedbackDiv.innerHTML = '<p class="loading-message">Carregando detalhes...</p>';
    if (gridContainer) gridContainer.style.opacity = '0.5';
    renderClientDetails(null);
    renderClientPhotos([]);
    const medidasContentDiv = document.getElementById('detalhes-medidas-content');
    if (medidasContentDiv) {
        medidasContentDiv.innerHTML = '<p class="placeholder-message">Clique em "Ver Histórico" para carregar as medidas.</p>';
        medidasContentDiv.style.display = 'none';
        medidasContentDiv.dataset.loaded = "false";
        const btnMed = document.getElementById('toggle-medidas-btn');
        if(btnMed) {
            btnMed.classList.remove('active');
            btnMed.innerHTML = '<i class="fas fa-eye"></i> Ver Histórico';
        }
    }
    const anamneseContentDiv = document.getElementById('detalhes-anamnese-content');
    if (anamneseContentDiv) {
        anamneseContentDiv.innerHTML = '<p class="placeholder-message">Clique em "Ver Atual" para carregar a anamnese.</p>';
        anamneseContentDiv.style.display = 'none';
        anamneseContentDiv.dataset.loaded = "false";
        const btnAnam = document.getElementById('toggle-anamnese-btn');
        if(btnAnam) {
            btnAnam.classList.remove('active');
            btnAnam.innerHTML = '<i class="fas fa-eye"></i> Ver Atual';
        }
    }
    try {
        const response = await fetch(`/api/clientes/${clientId}`, { credentials: 'include' });
        const data = await response.json();
        if (feedbackDiv) feedbackDiv.innerHTML = '';
        if (!response.ok || !data.success || !data.client) {
            throw new Error(data.message || `Erro ${response.status}`);
        }
        renderClientDetails(data.client);
        await loadAndRenderClientPhotos(clientId); 
    } catch (error) {
        console.error("[App.js] Detalhes Cliente: Erro ao carregar dados principais:", error);
        if (feedbackDiv) feedbackDiv.innerHTML = `<p class="error-message">Falha ao carregar detalhes: ${error.message}</p>`;
        renderClientDetails(null); renderClientPhotos([]);
        if (medidasContentDiv) {
            medidasContentDiv.innerHTML = `<p class="error-message">Falha ao carregar. Tente "Ver Histórico" novamente.</p>`;
            medidasContentDiv.dataset.loaded = "error";
        }
        if (anamneseContentDiv) {
            anamneseContentDiv.innerHTML = `<p class="error-message">Falha ao carregar. Tente "Ver Atual" novamente.</p>`;
            anamneseContentDiv.dataset.loaded = "error";
        }
    } finally {
        if (gridContainer) gridContainer.style.opacity = '1';
    }
}

function initClienteDetalhes() {
    console.log("%c[app.js] initClienteDetalhes CHAMADA", 'color: orange; font-weight: bold;');
    const clientIdFromStorage = sessionStorage.getItem('selectedClientId');
    if (!clientIdFromStorage || clientIdFromStorage === 'null' || clientIdFromStorage === 'undefined' || clientIdFromStorage.trim() === '') {
        console.warn("[APP.JS] initClienteDetalhes: ID do cliente inválido ou ausente na sessionStorage. Redirecionando para clientes.");
        navigateTo('clientes');
        sessionStorage.removeItem('selectedClientId');
        return;
    }
    currentClientDetailId = clientIdFromStorage;
    const pageElement = document.getElementById('cliente-detalhes');
    if (!pageElement) {
        console.error("[APP.JS] Elemento #cliente-detalhes não encontrado! Abortando initClienteDetalhes.");
        return;
    }
    pageElement.dataset.clientId = currentClientDetailId;
    const medidasContent = document.getElementById('detalhes-medidas-content');
    const toggleMedidasBtn = document.getElementById('toggle-medidas-btn');
    if (medidasContent && toggleMedidasBtn) {
        medidasContent.style.display = 'none';
        medidasContent.innerHTML = '<p class="placeholder-message">Clique em "Ver Histórico" para carregar.</p>';
        medidasContent.dataset.loaded = "false";
        toggleMedidasBtn.classList.remove('active');
        toggleMedidasBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Histórico';
    }
    const anamneseContent = document.getElementById('detalhes-anamnese-content');
    const toggleAnamneseBtn = document.getElementById('toggle-anamnese-btn');
    if (anamneseContent && toggleAnamneseBtn) {
        anamneseContent.style.display = 'none';
        anamneseContent.innerHTML = '<p class="placeholder-message">Clique em "Ver Atual" para carregar.</p>';
        anamneseContent.dataset.loaded = "false";
        toggleAnamneseBtn.classList.remove('active');
        toggleAnamneseBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Atual';
    }
    renderClientDetails(null);
    renderClientPhotos([]);
    const setupButtonListener = (buttonId, action) => {
        const button = pageElement?.querySelector(buttonId);
        if (button) {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', action);
        } else {
            console.warn(`[App] Botão ${buttonId} não encontrado em #cliente-detalhes.`);
        }
    };
    setupButtonListener('#detalhes-nova-cita-btn', (e) => {
        const id = currentClientDetailId;
        if (id) {
            sessionStorage.setItem('schedulingClientId', id);
            const name = document.getElementById('detalhes-cliente-nome')?.textContent;
            if (name && name !== 'Carregando...') sessionStorage.setItem('schedulingClientName', name);
            navigateTo('nueva-cita');
        }
    });
    setupButtonListener('#detalhes-editar-btn', (e) => {
        const id = currentClientDetailId;
        if (id) {
            sessionStorage.setItem('editingClientId', id);
            navigateTo('cliente-editar');
        }
    });
    setupButtonListener('#detalhes-agendar-nova-cita-btn', (e) => {
        const id = currentClientDetailId;
        if (id) {
            sessionStorage.setItem('schedulingClientId', id);
            const name = document.getElementById('detalhes-cliente-nome')?.textContent;
            if (name && name !== 'Carregando...') sessionStorage.setItem('schedulingClientName', name);
            navigateTo('nueva-cita');
        }
    });
    setupButtonListener('#registrar-novas-medidas-btn', (e) => {
        const clientId = currentClientDetailId;
        const clientName = document.getElementById('detalhes-cliente-nome')?.textContent || `Cliente ID ${clientId}`;
        if (clientId) {
            sessionStorage.setItem('medidasClientId', clientId);
            sessionStorage.setItem('medidasClientName', clientName);
            navigateTo('medidas-novo');
        } else {
            showNotification("Erro: ID do cliente não disponível.", "error");
        }
    });
    setupButtonListener('#detalhes-agregar-fotos-btn', (e) => {
        e.preventDefault();
        const currentId = currentClientDetailId;
        const modal = document.getElementById('upload-photo-modal');
        const hiddenInput = document.getElementById('upload-cliente-id');
        const form = document.getElementById('upload-photo-form');
        if (currentId && modal && hiddenInput && form) {
            hiddenInput.value = currentId;
            form.reset();
            document.getElementById('preview-antes-img').style.display = 'none';
            document.getElementById('preview-antes-img').src = '#';
            document.getElementById('preview-antes-vid').style.display = 'none';
            document.getElementById('preview-antes-vid').src = '';
            document.getElementById('preview-antes-name').style.display = 'none';
            document.getElementById('preview-antes-name').textContent = '';

            document.getElementById('preview-depois-img').style.display = 'none';
            document.getElementById('preview-depois-img').src = '#';
            document.getElementById('preview-depois-vid').style.display = 'none';
            document.getElementById('preview-depois-vid').src = '';
            document.getElementById('preview-depois-name').style.display = 'none';
            document.getElementById('preview-depois-name').textContent = '';
            modal.style.display = 'flex';
        } else {
            showNotification("Erro ao abrir formulário de upload.", "error");
        }
    });
    setupButtonListener('#detalhes-editar-anamnese-btn', (e) => {
        const clienteId = currentClientDetailId;
        const clienteNome = document.getElementById('detalhes-cliente-nome')?.textContent;
        const anamneseIdParaEditar = e.currentTarget.dataset.anamneseId;
        if (!clienteId) { showNotification("Erro: ID do cliente não disponível para anamnese.", "error"); return; }
        sessionStorage.setItem('anamneseClienteId', clienteId);
        if (clienteNome && clienteNome !== 'Carregando...') sessionStorage.setItem('anamneseClienteName', clienteNome);
        if (anamneseIdParaEditar) {
            sessionStorage.setItem('editingAnamneseId', anamneseIdParaEditar);
        } else {
            sessionStorage.removeItem('editingAnamneseId');
        }
        navigateTo('anamnese-form-page');
    });
    if (toggleMedidasBtn) {
        const newToggleMedidasBtn = toggleMedidasBtn.cloneNode(true);
        toggleMedidasBtn.parentNode.replaceChild(newToggleMedidasBtn, toggleMedidasBtn);
        newToggleMedidasBtn.addEventListener('click', async () => {
            const content = document.getElementById('detalhes-medidas-content');
            if (!content) return;
            if (content.style.display === 'none') {
                content.style.display = 'block';
                newToggleMedidasBtn.classList.add('active');
                newToggleMedidasBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Histórico';
                if (currentClientDetailId && (content.dataset.loaded !== "true" || content.dataset.loaded === "error")) {
                    await loadAndRenderClientMedidas(currentClientDetailId);
                }
            } else {
                content.style.display = 'none';
                newToggleMedidasBtn.classList.remove('active');
                newToggleMedidasBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Histórico';
            }
        });
    }
    if (toggleAnamneseBtn) {
        const newToggleAnamneseBtn = toggleAnamneseBtn.cloneNode(true);
        toggleAnamneseBtn.parentNode.replaceChild(newToggleAnamneseBtn, toggleAnamneseBtn);
        newToggleAnamneseBtn.addEventListener('click', async () => {
            const content = document.getElementById('detalhes-anamnese-content');
            if(!content) return;
            if (content.style.display === 'none') {
                content.style.display = 'block';
                newToggleAnamneseBtn.classList.add('active');
                newToggleAnamneseBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Atual';
                 if (currentClientDetailId && (content.dataset.loaded !== "true" || content.dataset.loaded === "error")) {
                    await loadAndRenderClientAnamnese(currentClientDetailId);
                }
            } else {
                content.style.display = 'none';
                newToggleAnamneseBtn.classList.remove('active');
                newToggleAnamneseBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Atual';
            }
        });
    }
    const photoModal = document.getElementById('upload-photo-modal');
    if (photoModal && !photoModal.dataset.listenerAttachedModal) {
        const closeModal = () => { 
            const form = document.getElementById('upload-photo-form');
            if (form) form.reset();
            document.getElementById('preview-antes-img').src = '#';
            document.getElementById('preview-antes-img').style.display = 'none';
            document.getElementById('preview-antes-vid').src = '';
            document.getElementById('preview-antes-vid').style.display = 'none';
            document.getElementById('preview-antes-name').textContent = '';
            document.getElementById('preview-antes-name').style.display = 'none';

            document.getElementById('preview-depois-img').src = '#';
            document.getElementById('preview-depois-img').style.display = 'none';
            document.getElementById('preview-depois-vid').src = '';
            document.getElementById('preview-depois-vid').style.display = 'none';
            document.getElementById('preview-depois-name').textContent = '';
            document.getElementById('preview-depois-name').style.display = 'none';

            photoModal.style.display = 'none';
        };
        photoModal.querySelector('.close-modal-btn')?.addEventListener('click', closeModal);
        photoModal.querySelector('.cancel-upload-btn')?.addEventListener('click', closeModal);
        const uploadForm = document.getElementById('upload-photo-form');
        if (uploadForm) { 
            uploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = uploadForm.querySelector('button[type="submit"]');
                const clienteIdForUpload = uploadForm.elements['clienteId'].value; 
                if (!clienteIdForUpload || !document.getElementById('foto-antes').files.length || !document.getElementById('foto-depois').files.length) {
                    showNotification("Selecione ambas as mídias e verifique o ID.", "warning"); return;
                }
                if (submitBtn) submitBtn.disabled = true; showNotification("Enviando mídias...", "info");
                try {
                    const response = await fetch(`/api/clientes/${clienteIdForUpload}/fotos`, { method: 'POST', body: new FormData(uploadForm), credentials: 'include' });
                    const result = await response.json();
                    if (response.ok && result.success) { showNotification(result.message || 'Mídias enviadas!', 'success'); closeModal(); loadAndRenderClientPhotos(clienteIdForUpload); }
                    else { throw new Error(result.message || `Erro ${response.status}`); }
                } catch (error) { showNotification(`Erro no upload: ${error.message}`, 'error'); }
                finally { if (submitBtn) submitBtn.disabled = false; }
            });
           }

        const handlePreview = (inputId, imgPreviewId, vidPreviewId, namePreviewId) => {
            const input = document.getElementById(inputId);
            const imgPreview = document.getElementById(imgPreviewId);
            const vidPreview = document.getElementById(vidPreviewId);
            const namePreview = document.getElementById(namePreviewId);

            if (input && imgPreview && vidPreview && namePreview) {
                input.addEventListener('change', function (event) {
                    const file = event.target.files[0];
                    imgPreview.src = '#'; imgPreview.style.display = 'none';
                    vidPreview.src = ''; vidPreview.style.display = 'none'; vidPreview.pause(); 
                    namePreview.textContent = ''; namePreview.style.display = 'none';

                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (file.type.startsWith('image/')) {
                                imgPreview.src = e.target.result;
                                imgPreview.style.display = 'block';
                            } else if (file.type.startsWith('video/')) {
                                vidPreview.src = e.target.result; 
                                vidPreview.style.display = 'block';
                            } else {
                                namePreview.textContent = `Arquivo: ${file.name} (tipo não suportado para preview)`;
                                namePreview.style.display = 'block';
                            }
                        };
                        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                            reader.readAsDataURL(file); 
                        } else {
                             namePreview.textContent = `Arquivo: ${file.name} (tipo não suportado para preview)`;
                             namePreview.style.display = 'block';
                        }
                    } else {
                         if (input.value) input.value = ''; 
                    }
                });
            }
        };
        handlePreview('foto-antes', 'preview-antes-img', 'preview-antes-vid', 'preview-antes-name');
        handlePreview('foto-depois', 'preview-depois-img', 'preview-depois-vid', 'preview-depois-name');
        photoModal.dataset.listenerAttachedModal = 'true';
    }
    const photosContainer = document.getElementById('detalhes-fotos');
    if (photosContainer && !photosContainer.dataset.deleteListener) {
        photosContainer.addEventListener('click', async (event) => { 
            const deleteButton = event.target.closest('.delete-photo-btn'); if (!deleteButton) return;
            const photoId = deleteButton.closest('.before-after-item')?.dataset.photoId;
            const currentClientIdForDelete = currentClientDetailId; 
            if (!photoId || !currentClientIdForDelete) { showNotification("Erro ao tentar excluir mídia.", "error"); return; }
            if (confirm(`Tem certeza que deseja excluir este par de mídias (ID Registro: ${photoId})?`)) {
                showNotification("Excluindo mídias...", "info");
                try {
                    const response = await fetch(`/api/fotos/${photoId}`, { method: 'DELETE', credentials: 'include' });
                    const result = await response.json();
                    if (response.ok && result.success) { showNotification(result.message || 'Mídias excluídas!', 'success'); loadAndRenderClientPhotos(currentClientIdForDelete); }
                    else { throw new Error(result.message || `Erro ${response.status}`); }
                } catch (error) { showNotification(`Erro ao excluir: ${error.message}`, 'error'); }
            }
          });
        photosContainer.dataset.deleteListener = 'true';
    }
    loadAndRenderClientDetails(currentClientDetailId);
    console.log("%c[app.js] initClienteDetalhes FINALIZADA", 'color: orange;');
}

function initApp() {
    console.log("Iniciando App...");
    if (!checkAuth()) return;

    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM completamente carregado e parseado.");
        const isLoginPage = window.location.pathname.endsWith('/login.html');
        const isRegisterPage = window.location.pathname.endsWith('/registro.html');

        if (!isLoginPage && !isRegisterPage) {
            loadInitialComponents();
            document.addEventListener('componentLoaded', (e) => {
                const containerId = e.detail?.id;
                if (!containerId) return;
                const cleanContainerId = containerId.startsWith('#') ? containerId.substring(1) : containerId;
                console.log(`[App] Evento 'componentLoaded' para container: #${cleanContainerId}`);

                if (cleanContainerId === 'sidebar-container' && !window.sidebarInitialized) {
                    console.log("[App] Sidebar carregada. Inicializando ThemeSwitcher e Navegação Global...");
                    initThemeSwitcher();
                    initNavigation();
                    const logoutBtn = document.getElementById('logout-btn');
                    if (logoutBtn) {
                        logoutBtn.removeEventListener('click', handleLogout);
                        logoutBtn.addEventListener('click', handleLogout);
                        console.log("[App] Listener de logout adicionado.");
                    } else {
                        console.warn("[App] Botão de logout não encontrado após carregar sidebar.");
                    }
                    window.sidebarInitialized = true;

                    let initialNavigationDone = false;
                    const essentialContainers = ['include-dashboard', 'agendamento-container', 'include-clientes'];
                    let loadedEssentialsCount = 0;

                    const initialPageLoadHandler = (event) => {
                        if (essentialContainers.includes(event.detail.id)) {
                            loadedEssentialsCount++;
                        }
                        const currentHash = window.location.hash.substring(1);
                        if (!initialNavigationDone && 
                            (event.detail.id === 'include-dashboard' || loadedEssentialsCount >= essentialContainers.length) &&
                            (sessionStorage.getItem('hasNavigated') !== 'true' || currentHash) ) {
                            
                            document.removeEventListener('componentLoaded', initialPageLoadHandler);
                            initialNavigationDone = true;
                            const targetPage = currentHash || 'dashboard';
                            console.log(`[App Init] Condição de navegação inicial atingida. Navegando para: #${targetPage}`);
                            navigateTo(targetPage);
                        }
                    };
                    document.addEventListener('componentLoaded', initialPageLoadHandler);
                    return; 
                }
            });

            document.addEventListener('pageActivated', (e) => {
                const pageId = e.detail?.pageId;
                if (!pageId) return;
                console.log(`%c[App] Evento 'pageActivated' recebido para: #${pageId}`, 'color: blueviolet');
                
                const detailSubPages = ['medidas-novo', 'anamnese-form-page', 'cliente-editar'];
                if (pageId !== 'cliente-detalhes' && !detailSubPages.includes(pageId)) {
                    if(sessionStorage.getItem('selectedClientId')) {
                        console.log(`[App] 'pageActivated' para '${pageId}', limpando 'selectedClientId' e 'currentClientDetailId'.`);
                        sessionStorage.removeItem('selectedClientId');
                        currentClientDetailId = null; 
                    }
                }

                const initFunctionsForPage = {
                    'dashboard': initDashboard,
                    'clientes': initClientesList,
                    'cliente-detalhes': initClienteDetalhes,
                    'clientes-novo': initClientForm,
                    'cliente-editar': initEditarClienteForm,
                    'agendamento': initCalendar,
                    'nueva-cita': initNuevaCitaForm,
                    'editar-cita': initEditarCitaForm,
                    'financeiro': initFinanceiro,
                    'financeiro-novo': initTransactionForm,
                    'financeiro-editar': initFinanceiroEditForm,
                    'estoque': initEstoque,
                    'produto-novo': initNovoProduto,
                    'lembretes': initLembretes,
                    'relatorios': initRelatoriosPage,
                    'prontuarios': initProntuarios,
                    'medidas-novo': initNovaMedidaForm,
                    'anamnese-form-page': initAnamneseForm,
                    'dia-agendamentos': initDiaAgendamentos,
                };
                const initFunc = initFunctionsForPage[pageId];
                if (typeof initFunc === 'function') {
                    console.log(`%c[App] Chamando ${initFunc.name || 'função anônima'} para a página #${pageId}`, 'color: blueviolet');
                    try { initFunc(); }
                    catch (initError) { console.error(`[App] Erro ao inicializar ${initFunc.name || pageId}:`, initError); showNotification(`Erro ao carregar a seção '${pageId}'.`, 'error'); }
                } else {
                    console.log(`%c[App] Nenhuma função de inicialização JS mapeada para a página #${pageId}`, 'color: grey');
                    
                    // Tratamento especial para páginas específicas
                    switch(pageId) {
                        case 'editar-produto':
                            // Adia a execução para o próximo ciclo de renderização do navegador,
                            // garantindo que todos os elementos HTML já foram carregados.
                            requestAnimationFrame(() => {
                                initEditarProduto();
                            });
                            break;
                        // ... (outros cases)
                    }
                }
            });
        } else {
            initThemeSwitcher();
            console.log("[App] Página de Login/Registro. Apenas ThemeSwitcher inicializado.");
        }
    });
}

function checkAuth() {
    const isLoginPage = window.location.pathname.endsWith('/login.html');
    const isRegisterPage = window.location.pathname.endsWith('/registro.html');
    if (isLoginPage || isRegisterPage) return true;
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
        console.log("[Auth] Usuário não autenticado. Redirecionando para login.html");
        window.location.href = 'login.html';
        return false;
    }
    console.log("[Auth] Usuário autenticado.");
    return true;
}

function handleLogout(event) {
    if (event) event.preventDefault();
    console.log("[Logout] Iniciando processo de logout...");
    showNotification('Saindo...', 'info');

    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                console.warn("[Logout] Resposta não OK do servidor ao tentar fazer logout:", response.status);
            }
            return response.text();
        })
        .catch(error => {
            console.error('[Logout] Erro na requisição fetch para /logout:', error);
        })
        .finally(() => {
            sessionStorage.clear();
            localStorage.removeItem('theme');
            console.log("[Logout] Sessão e localStorage limpos. Redirecionando para login.html");
            window.location.href = 'login.html';
        });
    return false;
}

initApp();