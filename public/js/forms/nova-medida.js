// clinica/public/js/forms/nova-medida.js
import { navigateTo } from '../navigation.js';
import { showNotification } from '../notification.js';

let currentClientIdForMedidas = null; // Para armazenar o ID do cliente

/**
 * Inicializa o formulário de novas medidas.
 */
export function initNovaMedidaForm() {
    console.log("Frontend: Inicializando formulário de Novas Medidas...");
    const form = document.getElementById('nova-medida-form');
    const clienteNomeEl = document.getElementById('form-medidas-cliente-nome');
    const medidaClienteIdInput = document.getElementById('medida-cliente-id');
    const dataInput = document.getElementById('medida-data');
    const backButton = document.getElementById('back-to-client-details-btn');
    const cancelButton = document.getElementById('cancel-nova-medida-btn');

    if (!form) {
        console.error("Frontend Error: Formulário #nova-medida-form não encontrado.");
        return;
    }

    // Recupera o ID do cliente da sessionStorage (definido ao clicar em "Registrar Novas Medidas")
    currentClientIdForMedidas = sessionStorage.getItem('medidasClientId');
    const clientNameForMedidas = sessionStorage.getItem('medidasClientName');

    if (!currentClientIdForMedidas) {
        showNotification('ID do cliente não encontrado para registrar medidas. Voltando...', 'error');
        navigateTo('clientes'); // Ou para 'cliente-detalhes' se houver um ID anterior válido
        return;
    }

    // Preenche o nome do cliente no título e o ID no input hidden
    if (clienteNomeEl && clientNameForMedidas) {
        clienteNomeEl.textContent = `Medidas para: ${clientNameForMedidas}`;
    } else if (clienteNomeEl) {
        clienteNomeEl.textContent = `Medidas para Cliente ID: ${currentClientIdForMedidas}`;
    }
    if (medidaClienteIdInput) {
        medidaClienteIdInput.value = currentClientIdForMedidas;
    }

    // Define a data atual como padrão para o campo de data
    if (dataInput && !dataInput.value) {
        dataInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Ajusta os botões de voltar/cancelar para usarem o ID do cliente atual
    const setButtonClientId = (button) => {
        if (button) {
            button.addEventListener('click', (e) => {
                if (e.currentTarget.dataset.page === 'cliente-detalhes') {
                    sessionStorage.setItem('selectedClientId', currentClientIdForMedidas);
                }
            });
        }
    };
    setButtonClientId(backButton);
    setButtonClientId(cancelButton);


    form.removeEventListener('submit', handleNovaMedidaSubmit); // Evita duplicar listener
    form.addEventListener('submit', handleNovaMedidaSubmit);

    console.log("Frontend: Formulário de Novas Medidas inicializado para cliente ID:", currentClientIdForMedidas);
}

/**
 * Manipulador para o envio do formulário de novas medidas.
 */
async function handleNovaMedidaSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const saveButton = form.querySelector('button[type="submit"].save-btn');
    const clienteId = form.elements['cliente_id'].value; // Pega do input hidden

    if (!clienteId) {
        showNotification('Erro: ID do cliente não está presente no formulário.', 'error');
        return;
    }

    if (saveButton) saveButton.disabled = true;
    showNotification("Registrando medidas...", "info");

    const formData = new FormData(form);
    const medidaData = {};
    formData.forEach((value, key) => {
        if (value.trim() !== '') { // Só inclui campos preenchidos
            medidaData[key] = value.trim();
        }
    });
    // cliente_id já está no medidaData vindo do input hidden

    console.log("Dados das medidas a serem enviados:", medidaData);

    try {
        const response = await fetch(`/api/clientes/${clienteId}/medidas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(medidaData),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message || 'Medidas registradas com sucesso!', 'success');
            form.reset();
            // Define a data atual novamente após o reset
            const dataInput = document.getElementById('medida-data');
            if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];
            
            // Guarda o ID do cliente para o qual as medidas foram salvas, para poder voltar corretamente
            sessionStorage.setItem('selectedClientId', clienteId);
            navigateTo('cliente-detalhes');
        } else {
            throw new Error(result.message || `Erro ${response.status} ao registrar medidas.`);
        }
    } catch (error) {
        console.error("Erro ao registrar medidas:", error);
        showNotification(`Falha ao registrar medidas: ${error.message}`, 'error');
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}