import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';

const CURRENCY_FORMAT = {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
};

async function populateCategoryFilter() {
    const categorySelect = document.getElementById('financeiro-filter-category');
    if (!categorySelect) {
        console.error("Frontend Error: Select '#financeiro-filter-category' não encontrado.");
        return;
    }

    const defaultOption = categorySelect.options[0];
    categorySelect.innerHTML = '';
    if (defaultOption) {
        categorySelect.appendChild(defaultOption);
        defaultOption.selected = true;
    } else {
        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = "Todas as Categorias";
        categorySelect.appendChild(allOption);
    }
    categorySelect.disabled = true;

    try {
        console.log("[financeiro.js] Buscando categorias da API: /api/transacoes/categories");
        const response = await fetch('/api/transacoes/categories', { credentials: 'include' });
        if (!response.ok) {
            let errorMsg = `Erro HTTP ${response.status}`;
            try { errorMsg = (await response.json()).message || errorMsg; } catch (e) { }
            throw new Error(errorMsg);
        }
        const data = await response.json();

        if (data.success && Array.isArray(data.categories)) {
            console.log("[financeiro.js] Categorias recebidas:", data.categories);
            data.categories.forEach(categoryName => {
                if (categoryName && typeof categoryName === 'string') {
                    const option = document.createElement('option');
                    option.value = categoryName;
                    option.textContent = categoryName;
                    categorySelect.appendChild(option);
                } else {
                    console.warn("Categoria inválida recebida:", categoryName);
                }
            });
            console.log("[financeiro.js] Dropdown de categorias populado.");
        } else {
            console.error("API de categorias não retornou um array ou sucesso foi false:", data);
            throw new Error(data.message || "Falha ao obter lista de categorias.");
        }
        categorySelect.disabled = false;

    } catch (error) {
        console.error("Frontend Error ao popular filtro de categorias:", error);
        showNotification(`Erro ao carregar categorias: ${error.message}`, 'error');
        if (categorySelect.options.length > 0) categorySelect.options[0].textContent = "Erro ao carregar cats.";
        categorySelect.disabled = true;
    }
}

export function initFinanceiro() {
    console.log("Frontend: Inicializando 'initFinanceiro'...");

    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterMonthSelect = document.getElementById('filter-month');
    const filterCategorySelect = document.getElementById('financeiro-filter-category');
    const tableBody = document.getElementById('transactions-table-body');

    if (addTransactionBtn) {
        const newBtn = addTransactionBtn.cloneNode(true);
        addTransactionBtn.parentNode.replaceChild(newBtn, addTransactionBtn);
        newBtn.addEventListener('click', () => {
            navigateTo('novo-registro-financeiro');
        });
    }

    function setupFilterListener(element, handler) {
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            newElement.addEventListener('change', handler);
        }
    }

    setupFilterListener(filterTypeSelect, refreshFinancialData);
    setupFilterListener(filterMonthSelect, refreshFinancialData);
    setupFilterListener(filterCategorySelect, refreshFinancialData);

    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            const editButton = event.target.closest('.edit-transaction-btn');
            if (editButton) {
                handleEditClick(editButton.dataset.id);
                return;
            }

            const deleteButton = event.target.closest('.delete-transaction-btn');
            if (deleteButton) {
                const row = deleteButton.closest('tr');
                handleDeleteClick(deleteButton.dataset.id, row);
                return;
            }
        });
    }

    populateCategoryFilter().then(() => {
        refreshFinancialData();
    });

    console.log("Frontend: 'initFinanceiro' inicializado.");
}

function refreshFinancialData() {
    const type = document.getElementById('filter-type')?.value || '';
    const month = document.getElementById('filter-month')?.value || 'current_month';
    const category = document.getElementById('financeiro-filter-category')?.value || '';

    console.log(`[financeiro.js] Atualizando dados com filtros: Tipo=${type}, Mês=${month}, Categoria=${category}`);

    updateSummaryCards(month, category);
    loadTransactions(type, month, category);
}

async function updateSummaryCards(month = 'current_month', category = '') {
    const apiUrl = `/api/transacoes/summary?month=${month}&category=${encodeURIComponent(category)}`;
    console.log(`Buscando resumo financeiro: ${apiUrl}`);

    const totalEntradasEl = document.getElementById('summary-ingresos');
    const totalSaidasEl = document.getElementById('summary-gastos');
    const saldoEl = document.getElementById('summary-balance');

    if (!totalEntradasEl || !totalSaidasEl || !saldoEl) {
        console.error("Elementos de resumo não encontrados no DOM.");
        return;
    }

    totalEntradasEl.textContent = 'Carregando...';
    totalSaidasEl.textContent = 'Carregando...';
    saldoEl.textContent = 'Carregando...';

    try {
        const response = await fetch(apiUrl, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }
        const data = await response.json();

        if (data.success) {
            const { ingresos, gastos, balance } = data.summary;
            totalEntradasEl.textContent = formatCurrency(ingresos);
            totalSaidasEl.textContent = formatCurrency(gastos);
            saldoEl.textContent = formatCurrency(balance);
        } else {
            throw new Error(data.message || 'Falha ao buscar resumo.');
        }
    } catch (error) {
        console.error("Erro ao atualizar cards de resumo:", error);
        showNotification(`Erro ao buscar resumo: ${error.message}`, 'error');
        totalEntradasEl.textContent = 'Erro';
        totalSaidasEl.textContent = 'Erro';
        saldoEl.textContent = 'Erro';
    }

    function formatCurrency(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return 'Inválido';
        return new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(num);
    }
}

async function loadTransactions(type = '', month = 'current_month', category = '') {
    const tableBody = document.getElementById('transactions-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando transações...</td></tr>';

    const apiUrl = `/api/transacoes?type=${type}&month=${month}&category=${encodeURIComponent(category)}`;
    console.log(`Buscando transações: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }
        const data = await response.json();

        if (data.success && Array.isArray(data.transactions)) {
            renderTransactionTable(data.transactions);
        } else {
            throw new Error(data.message || 'Falha ao carregar transações.');
        }
    } catch (error) {
        console.error("Erro ao carregar transações:", error);
        showNotification(`Erro ao carregar transações: ${error.message}`, 'error');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center error-message">${error.message}</td></tr>`;
        }
    }
}

function renderTransactionTable(transactions) {
    const tableBody = document.getElementById('transactions-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (transactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma transação encontrada para os filtros selecionados.</td></tr>';
        return;
    }

    transactions.forEach(trans => {
        const row = tableBody.insertRow();
        row.dataset.id = trans.id;

        const typeClass = trans.tipo === 'Entrada' ? 'type-entrada' : 'type-saida';

        let formattedDate = 'Inválida';
        if (trans.data) {
            try {
                const date = new Date(trans.data);
                if (!isNaN(date)) {
                    formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            } catch (e) { console.warn(`Erro ao formatar data ${trans.data}:`, e); }
        }

        let formattedValue = 'Inválido';
        if (trans.valor !== undefined && trans.valor !== null) {
            try {
                const valorNum = parseFloat(trans.valor);
                if (typeof valorNum === 'number' && !isNaN(valorNum)) {
                    formattedValue = new Intl.NumberFormat('es-PY', CURRENCY_FORMAT).format(valorNum);
                }
            } catch (e) { console.warn(`Erro ao formatar valor ${trans.valor}:`, e); }
        }

        row.insertCell().textContent = formattedDate;
        row.insertCell().textContent = trans.descricao || 'N/A';
        row.insertCell().textContent = trans.categoria || 'N/A';
        row.insertCell().innerHTML = `<span class="transaction-type ${typeClass}">${trans.tipo || 'N/A'}</span>`;
        row.insertCell().textContent = formattedValue;
        row.insertCell().innerHTML = `
            <button class="btn-icon edit-transaction-btn" title="Editar" data-id="${trans.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete-transaction-btn" title="Eliminar" data-id="${trans.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
    });
}

function handleEditClick(transactionId) {
    if (!transactionId) {
        console.error("handleEditClick chamado sem ID.");
        return;
    }
    console.log(`Preparando para editar ID: ${transactionId}`);
    sessionStorage.setItem('editingTransactionId', transactionId);
    navigateTo('financeiro-editar');
}

function handleDeleteClick(transactionId, tableRow) {
    if (!transactionId) {
        console.error("handleDeleteClick chamado sem ID.");
        return;
    }
    if (confirm(`¿Está seguro de que desea eliminar el registro financiero ID ${transactionId}? Esta acción no se puede deshacer.`)) {
        console.log(`Confirmado: Eliminar transação ID: ${transactionId}`);
        deleteTransactionOnServer(transactionId, tableRow);
    } else {
        console.log(`Cancelado: Eliminar transação ID: ${transactionId}`);
    }
}

async function deleteTransactionOnServer(transactionId, tableRow) {
    const apiUrl = `/api/transacoes/${transactionId}`;
    console.log(`Enviando DELETE para: ${apiUrl}`);
    showNotification("Eliminando registro...", "info");

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json().catch(async () => ({
            success: false,
            message: await response.text() || response.statusText
        }));


        if (!response.ok) {
            throw new Error(result.message || `Erro HTTP ${response.status}`);
        }
        if (!result.success) {
            throw new Error(result.message || "Falha ao eliminar registro no servidor.");
        }


        console.log("Registro eliminado com sucesso:", result.message);
        showNotification(result.message || "Registro eliminado correctamente.", "success");
        if (tableRow && tableRow.parentNode) {
            tableRow.style.transition = 'opacity 0.3s ease-out';
            tableRow.style.opacity = '0';
            setTimeout(() => {
                if (tableRow.parentNode) {
                    tableRow.remove();
                }
                updateSummaryCards();
            }, 300);
        } else {
            updateSummaryCards();
        }

    } catch (error) {
        console.error("Erro ao eliminar transação:", error);
        showNotification(`Erro ao eliminar: ${error.message}`, 'error');
    }
}