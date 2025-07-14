/**
 * Dashboard module - Handles all dashboard-related functionality
 */
import { showNotification } from '../notification.js';
import { formatCurrency, formatDateToDisplay } from '../utils/formatters.js';

let dashboardChartInstance = null;
let inventoryChartInstance = null;
let todaysBirthdayClientsData = [];

/**
 * Creates a dashboard appointment element
 * @param {Object} appointment - Appointment data
 * @returns {HTMLElement} The created appointment element
 */
export function createDashboardAppointmentElement(appointment) {
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

/**
 * Loads today's appointments
 */
export async function loadTodaysAppointments() {
    const container = document.getElementById('dashboard-appointments-container');
    const dateBadge = document.getElementById('dashboard-today-date');
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading-indicator">Carregando...</div>';
        if (dateBadge) {
            const today = new Date();
            dateBadge.textContent = today.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
        }

        const response = await fetch('/api/agendamentos/hoje');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        container.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(appointment => {
                container.appendChild(createDashboardAppointmentElement(appointment));
            });
        } else {
            container.innerHTML = '<div class="empty-state">Nenhum agendamento para hoje</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos do dia:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar agendamentos</div>';
    }
}

/**
 * Creates or updates the revenue chart
 * @param {Array} monthlyData - Monthly revenue data
 */
export function createOrUpdateRevenueChart(monthlyData = []) {
    const ctx = document.getElementById('dashboard-revenue-chart');
    if (!ctx) return;

    const months = monthlyData.map(item => item.month);
    const revenues = monthlyData.map(item => item.revenue);
    const expenses = monthlyData.map(item => item.expenses);

    const chartConfig = {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Receitas',
                    data: revenues,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: expenses,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('Gs. ', '');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            }
        }
    };

    if (dashboardChartInstance) {
        dashboardChartInstance.data = chartConfig.data;
        dashboardChartInstance.update();
    } else {
        dashboardChartInstance = new Chart(ctx, chartConfig);
    }
}

/**
 * Loads financial summary data
 */
export async function loadFinancialSummary() {
    const revenueElement = document.getElementById('dashboard-total-revenue');
    const expensesElement = document.getElementById('dashboard-total-expenses');
    const balanceElement = document.getElementById('dashboard-balance');
    
    if (!revenueElement || !expensesElement || !balanceElement) return;

    try {
        const response = await fetch('/api/financeiro/resumo');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data) {
            revenueElement.textContent = formatCurrency(data.totalRevenue || 0);
            expensesElement.textContent = formatCurrency(data.totalExpenses || 0);
            
            const balance = (data.totalRevenue || 0) - (data.totalExpenses || 0);
            balanceElement.textContent = formatCurrency(balance);
            balanceElement.classList.toggle('positive', balance >= 0);
            balanceElement.classList.toggle('negative', balance < 0);

            if (data.monthlyData && Array.isArray(data.monthlyData)) {
                createOrUpdateRevenueChart(data.monthlyData);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar resumo financeiro:', error);
        showNotification('Erro ao carregar dados financeiros', 'error');
    }
}

/**
 * Renders the critical stock list
 * @param {Array} products - Products with critical stock
 */
export function renderCriticalStockList(products) {
    const container = document.getElementById('dashboard-critical-stock');
    if (!container) return;

    container.innerHTML = '';
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum produto com estoque crítico</div>';
        return;
    }

    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'critical-stock-item';
        item.innerHTML = `
            <span class="product-name">${product.nome}</span>
            <span class="stock-count ${product.quantidade <= 0 ? 'out-of-stock' : ''}">${product.quantidade}</span>
        `;
        item.onclick = () => {
            window.location.href = `#estoque?produto=${product.id}`;
        };
        container.appendChild(item);
    });
}

/**
 * Creates or updates the inventory chart
 * @param {Object} statusCounts - Counts of products by status
 */
export function createOrUpdateInventoryChart(statusCounts) {
    const ctx = document.getElementById('dashboard-inventory-chart');
    if (!ctx) return;

    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: ['Normal', 'Baixo', 'Crítico', 'Sem Estoque'],
            datasets: [{
                data: [
                    statusCounts.normal || 0,
                    statusCounts.low || 0,
                    statusCounts.critical || 0,
                    statusCounts.outOfStock || 0
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',  // Normal - Verde
                    'rgba(255, 206, 86, 0.7)',  // Baixo - Amarelo
                    'rgba(255, 159, 64, 0.7)',  // Crítico - Laranja
                    'rgba(255, 99, 132, 0.7)'   // Sem Estoque - Vermelho
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };

    if (inventoryChartInstance) {
        inventoryChartInstance.data = chartConfig.data;
        inventoryChartInstance.update();
    } else {
        inventoryChartInstance = new Chart(ctx, chartConfig);
    }
}

/**
 * Loads inventory summary data
 */
export async function loadInventorySummary() {
    const container = document.getElementById('dashboard-critical-stock');
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading-indicator">Carregando...</div>';
        
        const response = await fetch('/api/estoque/resumo');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data) {
            renderCriticalStockList(data.criticalStock || []);
            
            if (data.statusCounts) {
                createOrUpdateInventoryChart(data.statusCounts);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar resumo de estoque:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar dados</div>';
    }
}

/**
 * Creates a birthday item element
 * @param {Object} client - Client data
 * @param {boolean} isUpcoming - Whether this is an upcoming birthday
 * @returns {HTMLElement} The created birthday item element
 */
export function createBirthdayItemElement(client, isUpcoming = false) {
    const item = document.createElement('div');
    item.className = 'birthday-item';
    
    const birthdayDate = new Date(client.data_nascimento);
    const today = new Date();
    const birthdayThisYear = new Date(today.getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());
    
    let age = today.getFullYear() - birthdayDate.getFullYear();
    if (today < birthdayThisYear) {
        age--;
    }
    
    const formattedDate = formatDateToDisplay(client.data_nascimento);
    
    let dateText;
    if (isUpcoming) {
        const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));
        dateText = `Em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`;
    } else {
        dateText = 'Hoje';
    }
    
    item.innerHTML = `
        <div class="birthday-avatar">
            ${client.foto ? `<img src="${client.foto}" alt="${client.nome}" onerror="this.src='/img/default-avatar.png'">` : 
            `<div class="default-avatar">${client.nome.charAt(0)}</div>`}
        </div>
        <div class="birthday-details">
            <h4>${client.nome}</h4>
            <p>${dateText} - ${formattedDate} (${age} anos)</p>
        </div>
        ${client.telefone ? `
        <button class="birthday-action whatsapp-btn" data-phone="${client.telefone}" data-name="${client.nome}">
            <i class="fas fa-birthday-cake"></i>
        </button>` : ''}
    `;
    
    // Add event listener for WhatsApp button
    const whatsappBtn = item.querySelector('.whatsapp-btn');
    if (whatsappBtn) {
        whatsappBtn.onclick = (e) => {
            e.stopPropagation();
            const phone = whatsappBtn.dataset.phone;
            const name = whatsappBtn.dataset.name;
            const formattedPhone = formatPhoneNumberForWhatsApp(phone);
            const message = `Feliz aniversário, ${name}! 🎂 Desejamos um dia maravilhoso e cheio de alegrias. Abraços da equipe da Clínica.`;
            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        };
    }
    
    return item;
}

/**
 * Renders today's birthdays
 * @param {Array} birthdays - Today's birthdays
 */
export function renderTodaysBirthdays(birthdays) {
    const container = document.getElementById('dashboard-todays-birthdays');
    const footer = document.getElementById('dashboard-todays-birthdays-footer');
    
    if (!container) return;
    
    container.innerHTML = '';
    todaysBirthdayClientsData = birthdays || [];
    
    if (!birthdays || birthdays.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum aniversário hoje</div>';
        if (footer) footer.style.display = 'none';
        return;
    }
    
    birthdays.forEach(client => {
        container.appendChild(createBirthdayItemElement(client));
    });
    
    if (footer) {
        footer.style.display = 'flex';
    }
}

/**
 * Renders upcoming birthdays
 * @param {Array} birthdays - Upcoming birthdays
 */
export function renderUpcomingBirthdays(birthdays) {
    const container = document.getElementById('dashboard-upcoming-birthdays');
    const footer = document.getElementById('dashboard-upcoming-birthdays-footer');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!birthdays || birthdays.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum aniversário próximo</div>';
        if (footer) footer.style.display = 'none';
        return;
    }
    
    birthdays.forEach(client => {
        container.appendChild(createBirthdayItemElement(client, true));
    });
}

/**
 * Loads birthday summary data
 */
export async function loadBirthdaySummary() {
    const todaysContainer = document.getElementById('dashboard-todays-birthdays');
    const upcomingContainer = document.getElementById('dashboard-upcoming-birthdays');
    
    if (!todaysContainer && !upcomingContainer) return;
    
    try {
        if (todaysContainer) todaysContainer.innerHTML = '<div class="loading-indicator">Carregando...</div>';
        if (upcomingContainer) upcomingContainer.innerHTML = '<div class="loading-indicator">Carregando...</div>';
        
        const response = await fetch('/dashboard/birthdays');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data) {
            renderTodaysBirthdays(data.today || []);
            renderUpcomingBirthdays(data.upcoming || []);
        }
    } catch (error) {
        console.error('Erro ao carregar aniversários:', error);
        if (todaysContainer) todaysContainer.innerHTML = '<div class="error-state">Erro ao carregar dados</div>';
        if (upcomingContainer) upcomingContainer.innerHTML = '<div class="error-state">Erro ao carregar dados</div>';
    }
}

/**
 * Handles sending congratulations via WhatsApp
 */
export async function handleSendCongratsWhatsApp() {
    if (!todaysBirthdayClientsData || todaysBirthdayClientsData.length === 0) {
        showNotification('Não há aniversariantes hoje para enviar mensagens', 'warning');
        return;
    }

    const clientsWithPhone = todaysBirthdayClientsData.filter(client => client.telefone);
    
    if (clientsWithPhone.length === 0) {
        showNotification('Nenhum dos aniversariantes possui telefone cadastrado', 'warning');
        return;
    }

    try {
        const sendBtn = document.getElementById('send-birthday-congrats');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }

        const response = await fetch('/api/clientes/send-birthday-wishes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientIds: clientsWithPhone.map(client => client.id)
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result.success) {
            showNotification(`Mensagens de parabéns enviadas com sucesso para ${result.sent || 0} cliente(s)`, 'success');
        } else {
            throw new Error(result.message || 'Erro desconhecido ao enviar mensagens');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagens de parabéns:', error);
        showNotification('Erro ao enviar mensagens de parabéns', 'error');
    } finally {
        const sendBtn = document.getElementById('send-birthday-congrats');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-birthday-cake"></i> Enviar Parabéns';
        }
    }
}

/**
 * Initializes the dashboard
 */
export function initDashboard() {
    console.log('[Dashboard] Inicializando dashboard...');
    
    // Load dashboard data
    loadTodaysAppointments();
    loadFinancialSummary();
    loadInventorySummary();
    loadBirthdaySummary();
    
    // Set up event listeners
    const sendCongratsBtn = document.getElementById('send-birthday-congrats');
    if (sendCongratsBtn) {
        sendCongratsBtn.addEventListener('click', handleSendCongratsWhatsApp);
    }
    
    // Set up refresh buttons
    const setupRefreshButton = (buttonId, loadFunction) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                button.classList.add('rotating');
                loadFunction().finally(() => {
                    setTimeout(() => button.classList.remove('rotating'), 500);
                });
            });
        }
    };
    
    setupRefreshButton('refresh-appointments', loadTodaysAppointments);
    setupRefreshButton('refresh-financial', loadFinancialSummary);
    setupRefreshButton('refresh-inventory', loadInventorySummary);
    setupRefreshButton('refresh-birthdays', loadBirthdaySummary);
}
