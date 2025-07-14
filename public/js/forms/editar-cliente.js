// public/js/forms/editar-cliente.js
import { navigateTo } from '../navigation.js';
import { showNotification } from '../notification.js';

let currentEditingClientId = null;

/**
 * Tenta separar um número de telefone completo em código do país, DDD e número.
 * Esta é uma função simplificada e pode precisar de ajustes para cobrir todos os formatos.
 * @param {string} fullPhoneNumber O número de telefone completo.
 * @returns {object} Objeto com country, ddd, number.
 */
function parsePhoneNumber(fullPhoneNumber) {
    const result = { country: '595', ddd: '', number: '' }; // Default Paraguai
    if (!fullPhoneNumber || typeof fullPhoneNumber !== 'string') {
        return result;
    }

    let cleanedNumber = fullPhoneNumber.replace(/\D/g, ''); // Remove não dígitos

    // Tenta identificar códigos de país comuns
    if (cleanedNumber.startsWith('595')) { // Paraguai
        result.country = '595';
        cleanedNumber = cleanedNumber.substring(3);
        // Para PY: Celulares geralmente 09xx. Se o número restante tiver 9 dígitos e começar com 9...
        if (cleanedNumber.length === 9 && cleanedNumber.startsWith('9')) {
            result.ddd = cleanedNumber.substring(0, 3); // ex: 981
            result.number = cleanedNumber.substring(3); // ex: 123456
        } else if (cleanedNumber.length >= 6 && cleanedNumber.length <= 7 && !cleanedNumber.startsWith('9')) { // Assumindo fixo sem DDD explícito ou DDD curto
             result.number = cleanedNumber; // ex: 21xxxxxxx ou xxxxxx para Assunção e outras cidades
        } else if (cleanedNumber.length >= 8 && cleanedNumber.length <= 10) { // Tentativa para fixos com DDD
            // Esta parte é mais complexa devido à variação de DDDs no PY (2-4 dígitos)
            // Exemplo simples: se tiver 8-9 dígitos após 595 e não começar com 9, tenta pegar os 2 ou 3 primeiros como DDD
            if (!cleanedNumber.startsWith('9')) {
                 if (cleanedNumber.length === 8 || cleanedNumber.length === 9) { // Ex: 21123456 ou 781123456
                    result.ddd = cleanedNumber.substring(0, cleanedNumber.length - 6);
                    result.number = cleanedNumber.substring(cleanedNumber.length - 6);
                } else {
                    result.number = cleanedNumber;
                }
            } else {
                 result.number = cleanedNumber; // Se não encaixar nos padrões acima, joga tudo no número
            }
        }
         else {
            result.number = cleanedNumber;
        }
    } else if (cleanedNumber.startsWith('55')) { // Brasil
        result.country = '55';
        cleanedNumber = cleanedNumber.substring(2);
        if (cleanedNumber.length >= 10) { // DD (2) + Número (8 ou 9)
            result.ddd = cleanedNumber.substring(0, 2);
            result.number = cleanedNumber.substring(2);
        } else {
            result.number = cleanedNumber;
        }
    } else if (cleanedNumber.startsWith('54')) { // Argentina
        result.country = '54';
        cleanedNumber = cleanedNumber.substring(2);
        // Exemplo Argentina: pode ter um '9' para celulares após o código de país e antes do DDD
        if (cleanedNumber.startsWith('9') && cleanedNumber.length > 9) { // Celular com 9
            cleanedNumber = cleanedNumber.substring(1); // Remove o 9
            if (cleanedNumber.length >= 8) { // DDD (2-4) + Número (6-8)
                 // Difícil separar DDD do número sem lista de DDDs
                 result.number = cleanedNumber; // Simplificado: colocar tudo no número por enquanto
            }
        } else if (cleanedNumber.length >= 6) { // Fixo
            result.number = cleanedNumber; // Simplificado
        }
    } else if (cleanedNumber.startsWith('0') && (fullPhoneNumber.includes('9') || fullPhoneNumber.includes('21') )) { // Número local do Paraguai começando com 0
        result.country = '595'; // Assume Paraguai
        cleanedNumber = cleanedNumber.substring(1); // Remove o 0 inicial
         if (cleanedNumber.length === 9 && cleanedNumber.startsWith('9')) { // Celular 09...
            result.ddd = cleanedNumber.substring(0, 3);
            result.number = cleanedNumber.substring(3);
        } else if (cleanedNumber.length >= 6 && cleanedNumber.length <= 7) { // Fixo 021... ou outro DDD
            // Tentativa para fixos com DDD
             if (cleanedNumber.length === 8 || cleanedNumber.length === 9) { // Ex: 21123456 ou 781123456
                result.ddd = cleanedNumber.substring(0, cleanedNumber.length - 6);
                result.number = cleanedNumber.substring(cleanedNumber.length - 6);
            } else {
                result.number = cleanedNumber;
            }
        }
         else {
            result.number = cleanedNumber;
        }
    } else { // Sem código de país conhecido, assume número local (do país padrão)
        result.number = cleanedNumber;
    }
    // Garante que o número não seja apenas o DDD se o DDD for extraído de um celular PY
    if (result.country === '595' && result.ddd && result.ddd.startsWith('9') && result.number === '') {
        result.number = result.ddd;
        result.ddd = '';
    }


    console.log(`[parsePhoneNumber] Input: ${fullPhoneNumber}, Output:`, result);
    return result;
}

async function loadClientDataForEdit() {
    const form = document.getElementById('edit-client-form');
    if (!form) {
        console.error("Editar Cliente: Formulário #edit-client-form não encontrado.");
        return;
    }

    currentEditingClientId = sessionStorage.getItem('editingClientId');
    if (!currentEditingClientId) {
        navigateTo('clientes');
        return;
    }
    form.elements['id'].value = currentEditingClientId;

    const currentPhotoPreview = document.getElementById('current-client-photo-preview-img');
    const currentPhotoStatus = document.getElementById('current-client-photo-status');

    try {
        showNotification("Carregando dados do cliente...", "info");
        const response = await fetch(`/api/clientes/${currentEditingClientId}`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok || !data.success || !data.client) {
            throw new Error(data.message || `Erro ${response.status} ao buscar cliente.`);
        }

        const client = data.client;

        form.elements['nome_completo'].value = client.nome_completo || '';
        form.elements['email'].value = client.email || '';

        // ---- MODIFICAÇÃO PARA TELEFONE ----
        const parsedPhone = parsePhoneNumber(client.telefone);
        form.elements['phone_country'].value = parsedPhone.country || '595';
        form.elements['phone_ddd'].value = parsedPhone.ddd || '';
        form.elements['phone_number'].value = parsedPhone.number || '';
        // ---- FIM DA MODIFICAÇÃO ----

        form.elements['data_nascimento'].value = client.data_nascimento ? client.data_nascimento.split('T')[0] : '';
        form.elements['endereco'].value = client.endereco || '';
        form.elements['cidade'].value = client.cidade || '';
        form.elements['documento_identidade'].value = client.documento_identidade || '';
        form.elements['profissao'].value = client.profissao || '';
        form.elements['observacoes'].value = client.observacoes || '';

        if (currentPhotoPreview && currentPhotoStatus) {
            if (client.foto_perfil) {
                currentPhotoPreview.src = `/${client.foto_perfil.replace(/\\/g, '/')}`;
                currentPhotoPreview.style.display = 'block';
                currentPhotoStatus.textContent = '(Foto atual)';
            } else {
                currentPhotoPreview.src = 'img/users/default-avatar.png';
                currentPhotoPreview.style.display = 'block';
                currentPhotoStatus.textContent = '(Nenhuma foto cadastrada)';
            }
        }
        showNotification("Dados carregados.", "success"); // Adicionado feedback
    } catch (error) {
        console.error("Erro ao carregar dados do cliente para edição:", error);
        showNotification(`Falha ao carregar dados: ${error.message}`, 'error');
        navigateTo('clientes');
    }
}

async function handleEditSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const saveButton = form.querySelector('button[type="submit"].save-btn');
    const clientId = form.elements['id'].value;

    if (!clientId) {
        showNotification("Erro crítico: ID do cliente não encontrado.", "error");
        return;
    }

    if (saveButton) saveButton.disabled = true;
    showNotification("Atualizando dados do cliente...", "info");

    try {
        // Criar objeto com os dados do cliente
        const clientData = {};

        // Adicionar campos básicos
        const basicFields = ['nome_completo', 'email', 'data_nascimento', 'endereco', 'cidade', 'documento_identidade', 'profissao', 'observacoes'];
        basicFields.forEach(field => {
            if (form.elements[field]) {
                clientData[field] = form.elements[field].value.trim();
            }
        });

        // Tratar telefone
        const countryCode = form.elements['phone_country'].value.trim();
        const ddd = form.elements['phone_ddd'].value.trim();
        const number = form.elements['phone_number'].value.trim();

        if (!number) {
            throw new Error('O campo "Número" do telefone é obrigatório.');
        }

        // Montar número de telefone completo
        clientData.telefone = (countryCode + ddd + number).replace(/\s/g, '');

        // Tratar foto do perfil
        const photoInput = form.elements['foto_perfil'];
        if (photoInput && photoInput.files.length > 0) {
            const formData = new FormData();
            formData.append('foto_perfil', photoInput.files[0]);
            
            // Adicionar todos os outros campos ao FormData
            Object.keys(clientData).forEach(key => {
                formData.append(key, clientData[key]);
            });

            // Enviar com FormData se houver arquivo
            const response = await fetch(`/api/clientes/${clientId}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao atualizar cliente.');
            }
        } else {
            // Enviar como JSON se não houver arquivo
            const response = await fetch(`/api/clientes/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData),
                credentials: 'include'
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao atualizar cliente.');
            }
        }

        showNotification('Cliente atualizado com sucesso!', 'success');
        form.reset();
        sessionStorage.removeItem('editingClientId');
        navigateTo('clientes');

    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        showNotification(`Erro ao atualizar: ${error.message}`, 'error');
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

export function initEditarClienteForm() {
    console.log("Editar Cliente: Inicializando formulário...");
    const form = document.getElementById('edit-client-form');
    const photoInput = document.getElementById('edit-client-photo');
    const photoPreviewContainer = document.getElementById('edit-client-photo-preview');

    if (!form) { return; }

    loadClientDataForEdit();

    form.removeEventListener('submit', handleEditSubmit);
    form.addEventListener('submit', handleEditSubmit);

    if (photoInput && photoPreviewContainer) {
        photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            photoPreviewContainer.innerHTML = '';
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '100px'; img.style.maxHeight = '100px'; img.style.marginTop = '5px';
                    photoPreviewContainer.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        });
    }
    console.log("Editar Cliente: Formulário inicializado.");
}