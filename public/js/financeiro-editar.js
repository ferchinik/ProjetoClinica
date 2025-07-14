import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';

let currentEditingId = null;

export function initFinanceiroEditForm() {
    console.log("Frontend: Inicializando formulário de EDIÇÃO de transação (#transaction-edit-form)...");
    const form = document.getElementById('transaction-edit-form');
    const saveButton = form ? form.querySelector('button[type="submit"].save-btn') : null;

    if (!form) {
        console.error("Frontend Error: Formulário #transaction-edit-form não encontrado.");
        return;
    }

    console.log('[financeiro-editar.js] Conteúdo atual de editingTransactionId na sessionStorage ANTES de ler:', sessionStorage.getItem('editingTransactionId'));

    currentEditingId = sessionStorage.getItem('editingTransactionId');
    sessionStorage.removeItem('editingTransactionId');

    if (!currentEditingId) {
        console.log('Editar Transação: Nenhum ID encontrado na sessão, redirecionando...');
        navigateTo('financeiro');
        return;
    }

    console.log(`Frontend: Editando ID: ${currentEditingId}`);

    const idInput = document.getElementById('trans-edit-id');
    if (idInput) {
        idInput.value = currentEditingId;
    }

    loadTransactionDataForEdit(currentEditingId, form);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (saveButton) saveButton.disabled = true;
        showNotification("Actualizando registro...", "info");

        const formData = new FormData(form);
        const transactionData = Object.fromEntries(formData.entries());

        console.log("Dados atualizados a enviar:", transactionData);

        const valor = parseFloat(transactionData.valor);
        if (isNaN(valor) || valor <= 0) {
             showNotification('El valor debe ser un número positivo.', 'error');
             if (saveButton) saveButton.disabled = false;
             return;
        }

        try {
            const response = await fetch(`/api/transacoes/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log("Frontend: Registro atualizado com sucesso:", result);
                showNotification(result.message || '¡Registro actualizado correctamente!', 'success');
                form.reset();
                currentEditingId = null;
                navigateTo('financeiro');
            } else {
                console.error("Frontend Error: API retornou erro ao atualizar:", result);
                showNotification(result.message || 'Error desconocido al actualizar.', 'error');
            }

        } catch (error) {
            console.error("Frontend Error: Erro na petição fetch ao atualizar:", error);
            showNotification(`Error de conexión o respuesta inválida: ${error.message}`, 'error');
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    });

    const cancelButton = form.querySelector('.cancel-btn');
     if (cancelButton && !cancelButton.dataset.page) {
         cancelButton.addEventListener('click', (e) => {
             e.preventDefault();
             currentEditingId = null;
             navigateTo('financeiro');
         });
    }

    console.log("Frontend: Inicialização de 'initFinanceiroEditForm' concluída.");
}

async function loadTransactionDataForEdit(id, form) {
    const apiUrl = `/api/transacoes/${id}`;
    console.log(`Buscando dados para edição: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl, { credentials: 'include' });
        if (!response.ok) {
            let errorMessage = `Erro HTTP ${response.status}`;
             try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                if(response.status === 404) { errorMessage = 'Endpoint da API não encontrado.'; }
            } catch(e) {
                 errorMessage = response.statusText || errorMessage;
                 if(response.status === 404) { errorMessage = 'Endpoint da API não encontrado.'; }
            }
            throw new Error(errorMessage);
        }
        const data = await response.json();

        if (data.success && data.transaction) {
            const trans = data.transaction;
            console.log("Dados recebidos para edição:", trans);

            form.elements['data'].value = trans.data ? trans.data.split('T')[0] : '';
            form.elements['tipo'].value = trans.tipo || '';
            form.elements['descricao'].value = trans.descricao || '';
            form.elements['categoria'].value = trans.categoria || '';
            form.elements['valor'].value = trans.valor || '';

        } else {
             throw new Error(data.message || 'Transação não encontrada ou falha na API.');
        }
    } catch(error) {
        console.error("Erro ao buscar dados da transação para edição:", error);
        showNotification(`Erro ao carregar dados para edição: ${error.message}`, 'error');
        navigateTo('financeiro');
    }
}