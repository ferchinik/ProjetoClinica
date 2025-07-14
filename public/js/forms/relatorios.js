// public/js/forms/relatorios.js - VERSÃO COMPLETA E CORRIGIDA

import { showNotification } from '../notification.js';

let faturamentoDiarioChart = null;
let procedimentosChart = null;

// Constante para formatação de moeda
const CURRENCY_FORMAT = {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
};

/**
 * Inicializa a página de relatórios:
 * - Define datas padrão
 * - Adiciona listeners para Atualizar, Exportar e Imprimir
 * - Dispara o carregamento inicial dos dados
 */
export function initRelatoriosPage() {
    console.log('[Relatorios.js] Iniciando página de relatórios...');

    const startDateInput    = document.getElementById('reportStartDate');
    const endDateInput      = document.getElementById('reportEndDate');
    const updateButton      = document.getElementById('updateReportBtn');
    const exportButton      = document.getElementById('exportBtn');
    const printButton       = document.getElementById('printBtn');

    if (!startDateInput || !endDateInput || !updateButton) {
        console.error('[Relatorios.js] Elementos essenciais não encontrados na página.');
        return;
    }

    // Datas padrão: primeiro dia do mês até hoje
    const today             = new Date();
    const firstDayOfMonth   = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate        = date => date.toISOString().split('T')[0];
    startDateInput.value    = formatDate(firstDayOfMonth);
    endDateInput.value      = formatDate(today);

    // Listener no botão Atualizar (substitui pra garantir apenas um listener ativo)
    const newUpdateButton = updateButton.cloneNode(true);
    updateButton.parentNode.replaceChild(newUpdateButton, updateButton);
    newUpdateButton.addEventListener('click', () => loadReportData());

    // Listener no botão Exportar → baixa o Excel
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            window.location.href = '/relatorios/export';
        });
    }

    // Listener no botão Imprimir → abre diálogo de impressão
    if (printButton) {
        printButton.addEventListener('click', () => {
            window.print();
        });
    }

    // Carrega os dados iniciais
    loadReportData();
}


/**
 * Carrega E renderiza TODOS os blocos do relatório:
 * ✔️ Cards de resumo
 * ✔️ Gráfico de faturamento diário
 * ✔️ Gráfico de procedimentos
 * ✔️ Tabela de agendamentos
 */
async function loadReportData() {
    const startDateInput = document.getElementById('reportStartDate');
    const endDateInput   = document.getElementById('reportEndDate');

    if (!startDateInput || !endDateInput) return;
    const startDate = startDateInput.value;
    const endDate   = endDateInput.value;

    // Validações de data
    if (!startDate || !endDate) {
        showNotification('Selecione as datas de início e fim.', 'warning');
        return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        showNotification('Data de início não pode ser posterior à data de fim.', 'warning');
        return;
    }

    console.log(`[Relatorios.js] Carregando dados de ${startDate} a ${endDate}...`);
    resetSummaryCards();

    try {
        await Promise.all([
            loadReportSummaryCards(startDate, endDate),
            loadAndRenderChart(startDate, endDate),
            loadAndRenderProcedimentosChart(startDate, endDate),
            loadReportAppointmentsTable(startDate, endDate),
        ]);
        console.log('[Relatorios.js] Todos os dados foram carregados com sucesso.');
    } catch (err) {
        console.error('[Relatorios.js] Erro geral ao carregar relatório:', err);
        showNotification('Erro ao carregar um ou mais blocos do relatório. Veja o console.', 'error');
        renderSummaryCards(null, true);
        clearChartArea('Erro ao carregar gráfico.');
        clearProcedimentosChartArea('Erro ao carregar gráfico.');
        clearAppointmentsTable('Erro ao carregar tabela.', true);
    }
}


// ----------------------
// FUNÇÕES DOS CARDS
// ----------------------

function resetSummaryCards() {
    ['faturamento', 'citas', 'novos', 'ticket'].forEach(key => {
        const el = document.getElementById(`report-summary-${key}`);
        if (el) el.textContent = '...';
    });
}

async function loadReportSummaryCards(startDate, endDate) {
    try {
        const url      = `/api/dashboard/reports-summary?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, { credentials: 'include' });
        const data     = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        renderSummaryCards(data.summary);
    } catch (err) {
        console.error('[Relatorios.js] Cards: erro ao buscar dados:', err);
        renderSummaryCards(null, true);
        throw err;
    }
}

function renderSummaryCards(summary = {}, isError = false) {
    const formatCurrency = v => {
        if (isError) return 'Erro';
        const n = parseFloat(v) || 0;
        return new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(n);
    };
    const formatInteger = v => {
        if (isError) return 'Erro';
        const n = parseInt(v, 10) || 0;
        return n.toLocaleString('es-PY');
    };

    const mappings = [
        { id: 'report-summary-faturamento', key: 'faturamento', fn: formatCurrency },
        { id: 'report-summary-citas',      key: 'citas',       fn: formatInteger },
        { id: 'report-summary-novos',      key: 'novosClientes', fn: formatInteger },
        { id: 'report-summary-ticket',     key: 'ticketMedio', fn: formatCurrency },
    ];

    mappings.forEach(({ id, key, fn }) => {
        const el = document.getElementById(id);
        el.textContent = fn(summary?.[key]);
    });
}


// ----------------------
// FUNÇÕES GRÁFICO DE FATURAMENTO DIÁRIO
// ----------------------

function clearChartArea(errMsg = '') {
    const loadingEl = document.getElementById('chartFaturamentoLoading');
    const errorEl   = document.getElementById('chartFaturamentoError');
    const canvas    = document.getElementById('relatorioFaturamentoDiarioChart');
    if (loadingEl) loadingEl.style.display = 'none';
    if (faturamentoDiarioChart) {
        faturamentoDiarioChart.destroy();
        faturamentoDiarioChart = null;
    }
    if (canvas && canvas.getContext) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    if (errorEl) {
        errorEl.textContent = errMsg;
        errorEl.style.display = errMsg ? 'block' : 'none';
    }
}

async function loadAndRenderChart(startDate, endDate) {
    const loadingEl = document.getElementById('chartFaturamentoLoading');
    if (loadingEl) loadingEl.style.display = 'block';
    clearChartArea();

    try {
        const url      = `/api/transacoes/reports/daily-revenue?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, { credentials: 'include' });
        const data     = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        const labels = [];
        const values = [];
        (data.dailyRevenue || []).forEach(item => {
            // formata “DD/MM”
            const [year, month, day] = item.dia.split('T')[0].split('-');
            labels.push(`${day}/${month}`);
            values.push(item.faturamento_total || 0);
        });

        if (labels.length) {
            renderFaturamentoDiarioChart(labels, values);
        } else {
            clearChartArea('Nenhum dado de faturamento para o período.');
        }
    } catch (err) {
        console.error('[Relatorios.js] Faturamento: erro ao buscar/renderizar gráfico:', err);
        clearChartArea(`Erro: ${err.message}`);
        throw err;
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function renderFaturamentoDiarioChart(labels, data) {
    const ctx = document.getElementById('relatorioFaturamentoDiarioChart')?.getContext('2d');
    if (!ctx) {
        console.error('[Relatorios.js] Faturamento: canvas não disponível');
        return;
    }

    if (faturamentoDiarioChart) {
        faturamentoDiarioChart.destroy();
    }

    faturamentoDiarioChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Facturación Diaria (₲)',
                data,
                backgroundColor: 'rgba(74, 144, 226, 0.6)',
                borderColor: 'rgba(74, 144, 226, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(v)
                    }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const val = ctx.parsed.y;
                            return `Facturación: ${new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(val)}`;
                        }
                    }
                }
            }
        }
    });

    console.log('[Relatorios.js] Faturamento: gráfico renderizado.');
}


// ----------------------
// FUNÇÕES TABELA DE AGENDAMENTOS
// ----------------------

function clearAppointmentsTable(message = '', isError = false) {
    const tbody   = document.getElementById('report-appointments-tbody');
    if (!tbody) return;
    const colspan = tbody.closest('table')?.querySelectorAll('thead th').length || 6;
    if (!message) {
        tbody.innerHTML = '';
    } else {
        const cssClass = isError ? 'error-message' : 'placeholder-message';
        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="${cssClass}" style="text-align:center; padding:20px;">
                    ${message}
                </td>
            </tr>
        `;
    }
}

async function loadReportAppointmentsTable(startDate, endDate) {
    const tbody = document.getElementById('report-appointments-tbody');
    if (!tbody) {
        console.error('[Relatorios.js] Tabela: tbody não encontrado');
        return Promise.reject('Tabela não encontrada');
    }

    clearAppointmentsTable('Carregando detalhes das citas...', false);

    try {
        const url      = `/api/agendamentos/by-range?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, { credentials: 'include' });
        const data     = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        renderAppointmentsTable(data.appointments || []);
    } catch (err) {
        console.error('[Relatorios.js] Tabela: erro ao buscar dados:', err);
        clearAppointmentsTable(`Erro: ${err.message}`, true);
        throw err;
    }
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('report-appointments-tbody');
    if (!tbody) return;

    if (!appointments.length) {
        clearAppointmentsTable('Nenhuma cita encontrada para este período.', false);
        return;
    }

    tbody.innerHTML = '';
    appointments.forEach(app => {
        const row = tbody.insertRow();
        // formata data/hora
        let date = 'N/A', time = '--:--';
        if (app.data_hora_iso) {
            const d = new Date(app.data_hora_iso);
            if (!isNaN(d)) {
                date = d.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                time = d.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }
        }

        const formatCurrency = v => {
            const n = parseFloat(v) || 0;
            return new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(n);
        };

        row.insertCell().textContent = date;
        row.insertCell().textContent = time;
        row.insertCell().textContent = app.paciente_nome      || 'N/A';
        row.insertCell().textContent = app.tipo_consulta      || 'N/A';
        row.insertCell().textContent = app.profissional_nome  || 'N/D';
        row.insertCell().textContent = formatCurrency(app.valor);
    });

    console.log(`[Relatorios.js] Tabela: renderizados ${appointments.length} agendamentos.`);
}


// ----------------------
// FUNÇÕES GRÁFICO DE PROCEDIMENTOS
// ----------------------

function clearProcedimentosChartArea(errMsg = '') {
    const loadingEl = document.getElementById('chartProcedimentosLoading');
    const errorEl   = document.getElementById('chartProcedimentosError');
    const canvas    = document.getElementById('relatorioProcedimentosChart');
    if (loadingEl) loadingEl.style.display = 'none';
    if (procedimentosChart) {
        procedimentosChart.destroy();
        procedimentosChart = null;
    }
    if (canvas && canvas.getContext) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    if (errorEl) {
        errorEl.textContent = errMsg;
        errorEl.style.display = errMsg ? 'block' : 'none';
    }
}

async function loadAndRenderProcedimentosChart(startDate, endDate) {
    const loadingEl = document.getElementById('chartProcedimentosLoading');
    if (loadingEl) loadingEl.style.display = 'block';
    clearProcedimentosChartArea();

    try {
        const url      = `/api/agendamentos/reports/procedure-counts?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, { credentials: 'include' });
        const data     = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        const labels = [];
        const values = [];
        (data.procedureCounts || []).forEach(item => {
            labels.push(item.procedimento || 'Desconhecido');
            values.push(item.quantidade || 0);
        });

        if (labels.length) {
            renderProcedimentosChart(labels, values);
        } else {
            clearProcedimentosChartArea('Nenhum procedimento realizado no período.');
        }
    } catch (err) {
        console.error('[Relatorios.js] Procedimentos: erro ao buscar/renderizar gráfico:', err);
        clearProcedimentosChartArea(`Erro: ${err.message}`);
        throw err;
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function renderProcedimentosChart(labels, data) {
    const ctx = document.getElementById('relatorioProcedimentosChart')?.getContext('2d');
    if (!ctx) {
        console.error('[Relatorios.js] Procedimentos: canvas não disponível');
        return;
    }

    if (procedimentosChart) {
        procedimentosChart.destroy();
    }

    // Paleta suave
    const palette = [
        'rgba(74,144,226,0.7)',
        'rgba(126,211,33,0.7)',
        'rgba(245,166,35,0.7)',
        'rgba(208,2,27,0.7)',
        'rgba(189,16,224,0.7)',
        'rgba(80,227,194,0.7)'
    ];
    const bgColors = palette.slice(0, data.length);
    const bdColors = bgColors.map(c => c.replace(/0\.7\)$/, '1)'));

    procedimentosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: bgColors,
                borderColor: bdColors,
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            return `${ctx.label}: ${ctx.parsed}`;
                        }
                    }
                }
            }
        }
    });

    console.log('[Relatorios.js] Procedimentos: gráfico renderizado.');
}


// ----------------------
// Auto-inicialização ao carregar o módulo
// ----------------------
document.addEventListener('relatoriosLoaded', initRelatoriosPage);
