// public/js/forms/client-form.js
import { navigateTo } from '../navigation.js';
import { showNotification } from '../notification.js';

export function initClientForm() {
    console.log("Frontend: Inicializando formulário de NOVO cliente (#client-form)...");
    const form = document.getElementById('client-form');
    const saveButton = form ? form.querySelector('button[type="submit"].save-btn') : null;
    const photoInput = document.getElementById('client-photo');
    const photoPreview = document.getElementById('client-photo-preview');

    if (!form) {
        console.error("Frontend Error: Formulário #client-form não encontrado.");
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("Frontend: Submit do #client-form (novo cliente) capturado.");

        if (saveButton) saveButton.disabled = true;
        showNotification("Salvando dados do cliente...", "info");

        const tempFormData = new FormData(form); // Temporário para pegar os valores
        
        // ---- MODIFICAÇÃO PARA TELEFONE ----
        const countryCode = tempFormData.get('phone_country');
        const ddd = tempFormData.get('phone_ddd')?.trim() || ''; // Garante que seja string
        const number = tempFormData.get('phone_number')?.trim();

        if (!number) { // Número é obrigatório
            showNotification('O campo "Número" do telefone é obrigatório.', 'error');
            if (saveButton) saveButton.disabled = false;
            return;
        }
        
        let fullPhoneNumber = countryCode;
        if (ddd) {
            fullPhoneNumber += ddd;
        }
        fullPhoneNumber += number;
        fullPhoneNumber = fullPhoneNumber.replace(/\s/g, '');
        // ---- FIM DA MODIFICAÇÃO ----

        // Cria o FormData final para enviar, incluindo a foto se houver
        const formDataToSend = new FormData();
        for (let [key, value] of tempFormData.entries()) {
            if (!['phone_country', 'phone_ddd', 'phone_number'].includes(key)) {
                if (key === 'photo' && value instanceof File && value.size > 0) {
                    formDataToSend.append(key, value);
                } else if (key !== 'photo') {
                     formDataToSend.append(key, value);
                }
            }
        }
        formDataToSend.set('telefone', fullPhoneNumber); // Adiciona o telefone combinado

        // Log para depuração
        // console.log("FormData final a ser enviado (novo cliente):");
        // for (let [key, value] of formDataToSend.entries()) {
        //     console.log(`${key}:`, value instanceof File ? value.name : value);
        // }

        try {
            const response = await fetch('/api/clientes', {
                method: 'POST',
                body: formDataToSend,
                credentials: 'include'
            });
            const result = await response.json().catch(async () => ({ success: false, message: await response.text() || `Erro ${response.status}` }));

            if (response.ok && result.success) {
                showNotification(result.message || 'Cliente salvo com sucesso!', 'success');
                form.reset();
                if (photoPreview) photoPreview.innerHTML = '';
                // Redefinir select do país para o padrão (Paraguai)
                const countrySelect = form.elements['phone_country'];
                if(countrySelect) countrySelect.value = '595';

                navigateTo('clientes');
            } else {
                throw new Error(result.message || 'Erro desconhecido ao salvar cliente.');
            }
        } catch (error) {
            console.error("Frontend Error: Erro na requisição fetch (novo cliente):", error);
            showNotification(`Erro: ${error.message}`, 'error');
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    });

    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            photoPreview.innerHTML = '';
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '100px';
                    img.style.marginTop = '10px';
                    photoPreview.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        });
    }
    console.log("Frontend: Inicialização de 'initClientForm' (novo cliente) concluída.");
}