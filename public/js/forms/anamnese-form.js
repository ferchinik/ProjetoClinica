// clinica/public/js/forms/anamnese-form.js
import { navigateTo } from '../navigation.js';
import { showNotification } from '../notification.js';

let currentAnamneseClienteId = null; // Armazena o ID do cliente para o qual a anamnese está sendo criada/editada
let currentEditingAnamneseId = null; // Armazena o ID da anamnese se estiver editando uma existente

/**
 * Inicializa o formulário de anamnese.
 * Determina se está em modo de criação ou edição e carrega os dados necessários.
 */
export function initAnamneseForm() {
    console.log("%c[ANAMNESE-FORM.JS] initAnamneseForm INICIADA", "color: dodgerblue; font-weight:bold;");
    const form = document.getElementById('anamnese-form');
    const clienteNomeEl = document.getElementById('anamnese-form-cliente-nome');
    const formTitleEl = document.getElementById('anamnese-form-title');
    const clienteIdInput = document.getElementById('anamnese-cliente-id-hidden'); // Input hidden para cliente_id
    const anamneseIdInput = document.getElementById('anamnese-id-hidden'); // Input hidden para id da anamnese (em edição)
    const dataInput = document.getElementById('anamnese-data');
    const backButton = document.getElementById('back-to-client-details-anamnese-btn');
    const cancelButton = document.getElementById('cancel-anamnese-form-btn');

    if (!form) {
        console.error("[ANAMNESE-FORM.JS] ERRO CRÍTICO: Formulário #anamnese-form não encontrado no DOM.");
        showNotification("Erro ao carregar formulário de anamnese.", "error");
        navigateTo('clientes'); // Volta para um local seguro
        return;
    }
    console.log("[ANAMNESE-FORM.JS] Formulário #anamnese-form encontrado.");

    // Recupera IDs da sessionStorage (devem ser setados antes de navegar para esta página)
    currentAnamneseClienteId = sessionStorage.getItem('anamneseClienteId');
    const clientNameForAnamnese = sessionStorage.getItem('anamneseClienteName');
    currentEditingAnamneseId = sessionStorage.getItem('editingAnamneseId'); // Será null se for nova anamnese

    console.log(`[ANAMNESE-FORM.JS] IDs recuperados da sessionStorage: clienteId='${currentAnamneseClienteId}', clienteName='${clientNameForAnamnese}', editingAnamneseId='${currentEditingAnamneseId}'`);

    if (!currentAnamneseClienteId) {
        showNotification('ID do cliente não fornecido para anamnese. Retornando...', 'error');
        console.error("[ANAMNESE-FORM.JS] ERRO: ID do cliente (anamneseClienteId) não encontrado na sessionStorage.");
        navigateTo('clientes');
        return;
    }
    console.log("[ANAMNESE-FORM.JS] ID do cliente para esta anamnese:", currentAnamneseClienteId);

    // Preenche o nome do cliente e o ID do cliente no input hidden
    if (clienteNomeEl) {
        clienteNomeEl.textContent = `Anamnese para: ${clientNameForAnamnese || `Cliente ID ${currentAnamneseClienteId}`}`;
    } else { console.warn("[ANAMNESE-FORM.JS] Elemento #anamnese-form-cliente-nome não encontrado."); }

    if (clienteIdInput) {
        clienteIdInput.value = currentAnamneseClienteId; // Garante que o ID do cliente está no formulário
        console.log("[ANAMNESE-FORM.JS] Input #anamnese-cliente-id-hidden preenchido com:", currentAnamneseClienteId);
    } else { console.warn("[ANAMNESE-FORM.JS] Input #anamnese-cliente-id-hidden não encontrado."); }


    // Configura botões de Voltar e Cancelar para navegar para os detalhes do cliente correto
    const setupNavigationButton = (buttonElement, targetPage) => {
        if (buttonElement) {
            // Remove listener antigo para evitar duplicação, clonando o botão
            const newButton = buttonElement.cloneNode(true);
            buttonElement.parentNode.replaceChild(newButton, buttonElement);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`[ANAMNESE-FORM.JS] Botão '${newButton.id || newButton.textContent}' clicado. Navegando para '${targetPage}'.`);
                if (currentAnamneseClienteId) { // Garante que temos um ID de cliente
                    sessionStorage.setItem('selectedClientId', currentAnamneseClienteId);
                }
                // Limpa IDs de edição da anamnese ao sair do formulário
                sessionStorage.removeItem('editingAnamneseId');
                sessionStorage.removeItem('anamneseClienteId'); // Pode ser redundante se selectedClientId for usado
                sessionStorage.removeItem('anamneseClienteName');
                navigateTo(targetPage);
            });
        } else {
            console.warn(`[ANAMNESE-FORM.JS] Botão para navegação (esperado para ${targetPage}) não encontrado.`);
        }
    };

    setupNavigationButton(backButton, 'cliente-detalhes');
    setupNavigationButton(cancelButton, 'cliente-detalhes');


    // Verifica se está editando uma anamnese existente ou criando uma nova
    if (currentEditingAnamneseId) {
        console.log("[ANAMNESE-FORM.JS] MODO DE EDIÇÃO para anamnese ID:", currentEditingAnamneseId);
        if (formTitleEl) formTitleEl.textContent = "Editar Anamnese";
        if (anamneseIdInput) {
            anamneseIdInput.value = currentEditingAnamneseId; // Preenche o ID da anamnese no input hidden
            console.log("[ANAMNESE-FORM.JS] Input #anamnese-id-hidden preenchido com:", currentEditingAnamneseId);
        } else { console.warn("[ANAMNESE-FORM.JS] Input #anamnese-id-hidden não encontrado para edição."); }
        loadAnamneseDataForEdit(currentEditingAnamneseId, form);
    } else {
        console.log("[ANAMNESE-FORM.JS] MODO DE CRIAÇÃO de nova anamnese.");
        if (formTitleEl) formTitleEl.textContent = "Nova Anamnese";
        if (anamneseIdInput) anamneseIdInput.value = ''; // Garante que o ID da anamnese está vazio
        form.reset(); // Limpa o formulário para nova entrada
        if (clienteIdInput) clienteIdInput.value = currentAnamneseClienteId; // Restaura o ID do cliente após o reset
        if (dataInput && !dataInput.value) { // Define a data atual como padrão se não houver valor
            dataInput.value = new Date().toISOString().split('T')[0];
            console.log("[ANAMNESE-FORM.JS] Data da anamnese definida para hoje (padrão).");
        }
    }

    // Adiciona (ou substitui) o listener de submit
    form.removeEventListener('submit', handleAnamneseSubmit); // Garante que não haja listeners duplicados
    form.addEventListener('submit', handleAnamneseSubmit);
    console.log("[ANAMNESE-FORM.JS] Listener de submit principal (handleAnamneseSubmit) configurado.");
    console.log("%c[ANAMNESE-FORM.JS] initAnamneseForm FINALIZADA", "color: dodgerblue; font-weight:bold;");
}

/**
 * Carrega os dados de uma anamnese existente para edição no formulário.
 * @param {string} anamneseId - O ID da anamnese a ser carregada.
 * @param {HTMLFormElement} form - O elemento do formulário a ser preenchido.
 */
async function loadAnamneseDataForEdit(anamneseId, form) {
    console.log(`%c[ANAMNESE-FORM.JS] loadAnamneseDataForEdit INICIADA para ID: ${anamneseId}`, "color: green; font-weight:bold;");
    showNotification("Carregando dados da anamnese para edição...", "info");
    try {
        const response = await fetch(`/api/anamneses/${anamneseId}`, { credentials: 'include' });
        const responseBodyText = await response.text();
        let data;
        try { data = JSON.parse(responseBodyText); }
        catch (e) {
            console.error("[ANAMNESE-FORM.JS] Erro ao parsear JSON da resposta (edição):", responseBodyText);
            throw new Error(`Resposta inválida do servidor (Status: ${response.status}).`);
        }

        console.log("[ANAMNESE-FORM.JS] Resposta da API (GET anamnese para edição):", data);

        if (!response.ok || !data.success || !data.anamnese) {
            throw new Error(data.message || `Erro ${response.status} ao buscar dados da anamnese.`);
        }

        const anamnese = data.anamnese;
        console.log("[ANAMNESE-FORM.JS] Dados da anamnese para preencher formulário:", anamnese);

        // Preenche todos os campos do formulário
        form.elements['data_anamnese'].value = anamnese.data_anamnese ? anamnese.data_anamnese.split('T')[0] : '';
        form.elements['queixa_principal'].value = anamnese.queixa_principal || '';
        form.elements['historico_doenca_atual'].value = anamnese.historico_doenca_atual || '';
        form.elements['antecedentes_pessoais'].value = anamnese.antecedentes_pessoais || '';
        form.elements['alergias'].value = anamnese.alergias || '';
        form.elements['medicamentos_em_uso'].value = anamnese.medicamentos_em_uso || '';
        form.elements['habitos_vida'].value = anamnese.habitos_vida || '';
        form.elements['habitos_nocivos'].value = anamnese.habitos_nocivos || '';
        form.elements['antecedentes_familiares'].value = anamnese.antecedentes_familiares || '';
        form.elements['rotina_cuidados_pele'].value = anamnese.rotina_cuidados_pele || '';
        form.elements['procedimentos_esteticos_anteriores'].value = anamnese.procedimentos_esteticos_anteriores || '';
        form.elements['expectativas_tratamento'].value = anamnese.expectativas_tratamento || '';
        form.elements['observacoes_gerais'].value = anamnese.observacoes_gerais || '';
        
        // Importante: O cliente_id da anamnese existente deve ser usado para consistência,
        // mas o currentAnamneseClienteId (da sessionStorage) é o contexto atual.
        // Se forem diferentes, pode indicar um problema de navegação ou lógica.
        if (form.elements['cliente_id'] && anamnese.cliente_id) {
            form.elements['cliente_id'].value = anamnese.cliente_id; // Preenche o ID do cliente da anamnese carregada
             console.log(`[ANAMNESE-FORM.JS] ID do cliente no form (edição) preenchido com: ${anamnese.cliente_id}. Contexto atual: ${currentAnamneseClienteId}`);
             if (String(anamnese.cliente_id) !== String(currentAnamneseClienteId)) {
                 console.warn(`[ANAMNESE-FORM.JS] ALERTA: ID do cliente da anamnese (${anamnese.cliente_id}) é diferente do ID do cliente em contexto (${currentAnamneseClienteId}).`);
                 // Poderia atualizar currentAnamneseClienteId aqui se necessário, mas depende da lógica de negócio.
                 // currentAnamneseClienteId = String(anamnese.cliente_id);
             }
        }

        showNotification("Dados carregados. Pronto para editar.", "success");

    } catch (error) {
        console.error("[ANAMNESE-FORM.JS] Erro ao carregar dados da anamnese para edição:", error);
        showNotification(`Falha ao carregar dados: ${error.message}`, 'error');
        navigateTo('cliente-detalhes'); // Volta para detalhes se falhar
    }
    console.log(`%c[ANAMNESE-FORM.JS] loadAnamneseDataForEdit FINALIZADA para ID: ${anamneseId}`, "color: green; font-weight:bold;");
}


/**
 * Manipulador para o evento de submit do formulário de anamnese (criação ou edição).
 */
async function handleAnamneseSubmit(event) {
    event.preventDefault();
    console.log("%c[ANAMNESE-FORM.JS] handleAnamneseSubmit INICIADO", "color: purple; font-weight:bold;");
    const form = event.target;
    const saveButton = form.querySelector('button[type="submit"].save-btn');

    // IDs importantes
    const clienteIdParaSalvar = form.elements['cliente_id'].value; // ID do cliente associado
    const anamneseIdParaEditar = form.elements['id'].value; // ID da anamnese, se estiver editando

    console.log(`[ANAMNESE-FORM.JS] Submit: clienteIdParaSalvar='${clienteIdParaSalvar}', anamneseIdParaEditar='${anamneseIdParaEditar}'`);

    if (!clienteIdParaSalvar) { // ID do cliente é sempre necessário
        showNotification("Erro crítico: ID do cliente não está definido no formulário.", "error");
        console.error("[ANAMNESE-FORM.JS] ERRO: #anamnese-cliente-id-hidden está vazio no submit.");
        if (saveButton) saveButton.disabled = false;
        return;
    }

    if (saveButton) saveButton.disabled = true;
    showNotification("Salvando anamnese...", "info");

    const formData = new FormData(form);
    const anamneseData = {};
    formData.forEach((value, key) => {
        // Inclui o campo mesmo que esteja vazio, para que o backend possa decidir como tratar (null vs string vazia)
        // O backend já trata campos opcionais como null se não enviados ou vazios.
        anamneseData[key] = value; // Não usar trim() aqui, pois pode remover espaços intencionais em textareas
    });
    
    // Garante que cliente_id e id (se editando) estejam corretos no payload
    anamneseData.cliente_id = clienteIdParaSalvar;
    if (anamneseIdParaEditar) {
        anamneseData.id = anamneseIdParaEditar;
    } else {
        delete anamneseData.id; // Remove o campo 'id' se for criação
    }


    console.log("[ANAMNESE-FORM.JS] Dados da anamnese prontos para API:", JSON.stringify(anamneseData, null, 2));

    let url;
    let method;

    if (anamneseIdParaEditar) { // Modo Edição
        url = `/api/anamneses/${anamneseIdParaEditar}`;
        method = 'PUT';
        console.log(`[ANAMNESE-FORM.JS] Modo EDIÇÃO. URL: ${url}, Method: ${method}`);
    } else { // Modo Criação
        url = `/api/clientes/${clienteIdParaSalvar}/anamneses`;
        method = 'POST';
        console.log(`[ANAMNESE-FORM.JS] Modo CRIAÇÃO. URL: ${url}, Method: ${method}`);
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(anamneseData),
            credentials: 'include'
        });

        const responseBodyText = await response.text();
        let result;
        try {
            result = JSON.parse(responseBodyText);
        } catch (e) {
            console.error("[ANAMNESE-FORM.JS] Erro ao parsear JSON da resposta:", responseBodyText, e);
            result = { success: response.ok, message: responseBodyText || `Erro ${response.status} (resposta não JSON)` };
        }
        
        console.log(`[ANAMNESE-FORM.JS] Resposta da API (Status: ${response.status}):`, result);

        if (response.ok && result.success) {
            showNotification(result.message || 'Anamnese salva com sucesso!', 'success');
            form.reset();
            
            // Limpa IDs da sessionStorage e globais após sucesso
            const clientNavId = currentAnamneseClienteId; // Guarda antes de limpar
            sessionStorage.removeItem('anamneseClienteId');
            sessionStorage.removeItem('anamneseClienteName');
            sessionStorage.removeItem('editingAnamneseId');
            currentAnamneseClienteId = null;
            currentEditingAnamneseId = null;

            if (clientNavId) {
                 console.log("[ANAMNESE-FORM.JS] Navegando para detalhes do cliente ID:", clientNavId);
                 sessionStorage.setItem('selectedClientId', clientNavId); // Garante que a página de detalhes carregue o cliente certo
                 navigateTo('cliente-detalhes');
            } else {
                console.warn("[ANAMNESE-FORM.JS] ID do cliente não disponível para navegação após salvar. Indo para lista de clientes.");
                navigateTo('clientes');
            }

        } else {
            throw new Error(result.message || `Erro ${response.status} ao salvar anamnese.`);
        }
    } catch (error) {
        console.error("[ANAMNESE-FORM.JS] Erro no fetch ou processamento da resposta:", error);
        showNotification(`Falha ao salvar anamnese: ${error.message}`, 'error');
    } finally {
        if (saveButton) saveButton.disabled = false;
        console.log("%c[ANAMNESE-FORM.JS] handleAnamneseSubmit FINALIZADO", "color: purple;");
    }
}


