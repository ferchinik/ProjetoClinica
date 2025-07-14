// public/js/dashboard.js
import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';
import { formatCurrency } from './utils.js';

// Variáveis que antes eram globais no app.js, agora são locais deste módulo
let dashboardChartInstance = null;
let inventoryChartInstance = null;
let todaysBirthdayClientsData = [];

// Função para formatar o número de telefone para o link do WhatsApp
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
        return cleaned;
    }
    return null;
}

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
                plugins: {
                    legend: { display: false },
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
                            callback: val => formatCurrency(val).replace('₲', '') // Remove Gs. para economizar espaço
                        }
                    },
                    x: { grid: { display: false } }
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
    if (todayEl) todayEl.textContent = '...';
    if (weekEl) weekEl.textContent = '...';
    if (monthEl) monthEl.textContent = '...';
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
        createOrUpdateRevenueChart([]);
    }
}

function renderCriticalStockList(products) {
    const listElement = document.getElementById('critical-stock-list');
    if (!listElement) return;
    listElement.innerHTML = '';
    if (!Array.isArray(products) || products.length === 0) {
        listElement.innerHTML = '<li class="placeholder-message">Nenhum produto com estoque crítico.</li>'; return;
    }
    products.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.titulo || '?'}</span> <span class="stock-level critical">${p.estoque} un.</span>`;
        li.style.cursor = 'pointer'; li.title = 'Ir para Inventário';
        li.onclick = () => navigateTo('estoque');
        listElement.appendChild(li);
    });
}
function createOrUpdateInventoryChart(statusCounts) {
    const canvas = document.getElementById('dashboard-inventory-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (inventoryChartInstance) inventoryChartInstance.destroy();
    const counts = statusCounts || {};
    const total = (counts.critical ?? 0) + (counts.low ?? 0) + (counts.normal ?? 0) + (counts.optimal ?? 0);
    if (total === 0) { return; }
    inventoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Crítico', 'Baixo', 'Normal', 'Ótimo'],
            datasets: [{
                data: [counts.critical ?? 0, counts.low ?? 0, counts.normal ?? 0, counts.optimal ?? 0],
                backgroundColor: ['rgba(217, 83, 79, 0.8)', 'rgba(240, 173, 78, 0.8)', 'rgba(74, 144, 226, 0.8)', 'rgba(153, 205, 133, 0.8)'],
                borderColor: 'var(--bg-secondary)',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: {
                legend: { position: 'right', labels: { padding: 10, boxWidth: 12, usePointStyle: true } },
                tooltip: { callbacks: { label: ctxLabel => `${ctxLabel.label || ''}: ${ctxLabel.parsed || 0}` } }
            }
        }
    });
}

async function loadInventorySummary() {
    const listContainer = document.getElementById('critical-stock-list');
    if (listContainer) listContainer.innerHTML = '<p class="loading-message">Carregando...</p>';
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
        createOrUpdateInventoryChart(null);
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
        const birthDate = new Date(client.data_nascimento);
        const day = birthDate.getUTCDate();
        const month = birthDate.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' });
        birthdayDateInfo = `${day} ${month.replace('.', '')}`;
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
        <div class="birthday-actions">
             <button class="btn-icon view-client-details-btn" title="Ver Cliente" data-client-id="${client.id}"><i class="fas fa-eye"></i></button>
        </div>`;
    
    div.querySelector('.view-client-details-btn').onclick = (e) => {
        e.stopPropagation();
        sessionStorage.setItem('selectedClientId', e.currentTarget.dataset.clientId);
        navigateTo('cliente-detalhes');
    };
    return div;
}

function renderTodaysBirthdays(birthdays) {
    const ul = document.getElementById('todays-birthdays-list');
    const footer = document.getElementById('today-birthday-footer');
    if (!ul) return;
    ul.innerHTML = '';
    if (footer) footer.style.display = 'none';

    todaysBirthdayClientsData = (birthdays || []).filter(client => client && client.telefone);

    if (!birthdays || birthdays.length === 0) {
        ul.innerHTML = `<p class="placeholder-message">Nenhum cumpleaños hoy.</p>`;
    } else {
        birthdays.forEach(client => ul.appendChild(createBirthdayItemElement(client, false)));
        if (todaysBirthdayClientsData.length > 0) {
            if (footer) footer.style.display = 'block';
        }
    }
}

function renderUpcomingBirthdays(birthdays) {
    const ul = document.getElementById('upcoming-birthdays-list');
    if (!ul) return;
    ul.innerHTML = '';
    if (!birthdays || birthdays.length === 0) {
        ul.innerHTML = `<p class="placeholder-message">Nenhum cumpleaños próximo.</p>`;
    } else {
        birthdays.forEach(client => ul.appendChild(createBirthdayItemElement(client, true)));
    }
}

async function loadBirthdaySummary() {
    const todayList = document.getElementById('todays-birthdays-list');
    const upcomingList = document.getElementById('upcoming-birthdays-list');
    if (todayList) todayList.innerHTML = '<p class="loading-message">Carregando...</p>';
    if (upcomingList) upcomingList.innerHTML = '<p class="loading-message">Carregando...</p>';
    try {
        const response = await fetch('/api/dashboard/birthdays', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) { throw new Error(data.message || 'Erro da API'); }
        renderTodaysBirthdays(data.today || []);
        renderUpcomingBirthdays(data.upcoming || []);
    } catch (error) {
        console.error("Erro ao carregar aniversários:", error);
        showNotification(`Erro nos aniversários: ${error.message}`, 'error');
        if (todayList) todayList.innerHTML = `<p class="error-message">Erro ao carregar.</p>`;
        if (upcomingList) upcomingList.innerHTML = `<p class="error-message">Erro ao carregar.</p>`;
    }
}

function handleSendCongratsWhatsApp() {
    if (!todaysBirthdayClientsData || todaysBirthdayClientsData.length === 0) {
        showNotification("Nenhum aniversariante com telefone para enviar mensagem.", "info");
        return;
    }
    const sentNames = [];
    todaysBirthdayClientsData.forEach(client => {
        const phone = formatPhoneNumberForWhatsApp(client.telefone);
        if (phone) {
            const clientName = client.nome_completo || "Cliente";
            const text = `Feliz Aniversário, ${clientName.split(' ')[0]}! A equipe da Clínica Estética deseja a você um dia maravilhoso e um ano novo cheio de alegrias e realizações. 🎉`;
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
            sentNames.push(clientName.split(' ')[0]);
        }
    });

    if (sentNames.length > 0) {
        showNotification(`Mensagens abertas para: ${sentNames.join(', ')}.`, 'success');
    } else {
        showNotification("Nenhum número de telefone válido encontrado para os aniversariantes de hoje.", 'warning');
    }
}


export function initDashboard() {
    loadTodaysAppointments();
    loadFinancialSummary();
    loadInventorySummary();
    loadBirthdaySummary();

    const sendCongratsBtn = document.getElementById('today-birthday-footer')?.querySelector('button');
    if (sendCongratsBtn) {
        const newBtn = sendCongratsBtn.cloneNode(true);
        sendCongratsBtn.parentNode.replaceChild(newBtn, sendCongratsBtn);
        newBtn.addEventListener('click', handleSendCongratsWhatsApp);
    }
}