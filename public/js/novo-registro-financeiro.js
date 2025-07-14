import { navigateTo } from './navigation.js'; 
import { showNotification } from './notification.js'; 

export function initTransactionForm() {
    console.log("Frontend: Inicializando formulário de transação (#transaction-form)...");
    const form = document.getElementById('transaction-form');
    const saveButton = form ? form.querySelector('button[type="submit"].save-btn') : null;
    let isSubmitting = false;

    if (!form) {
        console.error("Frontend Error: Formulário #transaction-form não encontrado.");
        return; 
    }
    if (!saveButton) {
        console.warn("Frontend Warning: Botão Guardar (.save-btn) não encontrado.");
    }

    const dateInput = document.getElementById('trans-date');
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        
        if (isSubmitting) {
            console.log("Frontend: Submissão já em andamento, ignorando...");
            return;
        }
        
        console.log("Frontend: Submit do #transaction-form capturado.");
        isSubmitting = true; 

        if (saveButton) saveButton.disabled = true;
        showNotification("Guardando registro...", "info");

        const formData = new FormData(form);
        const transactionData = Object.fromEntries(formData.entries());
        console.log("Dados brutos do formulário:", transactionData);

        let valorInputString = transactionData.valor; 

        if (typeof valorInputString === 'string') {
            const stringWithoutDots = valorInputString.replace(/\./g, '');
            const stringForParsing = stringWithoutDots.replace(/,/g, '.');
            
            transactionData.valor = parseFloat(stringForParsing);
        } else {
            transactionData.valor = parseFloat(valorInputString);
        }

        console.log("Dados após sanitização do valor:", transactionData);

        const valor = transactionData.valor;
        if (isNaN(valor) || valor <= 0) {
             showNotification('El valor debe ser un número positivo.', 'error');
             if (saveButton) saveButton.disabled = false; 
             isSubmitting = false; 
             return; 
        }

        try {
            const response = await fetch('/api/transacoes', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 
                },
                body: JSON.stringify(transactionData), 
                credentials: 'include' 
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log("Frontend: Registro guardado com éxito por la API:", result);
                showNotification(result.message || '¡Registro guardado correctamente!', 'success');
                form.reset(); 

                 if (dateInput) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    dateInput.value = `${year}-${month}-${day}`;
                }

                navigateTo('financeiro'); 
            } else {
                console.error("Frontend Error: La API retornó un error:", result);
                showNotification(result.message || 'Error desconocido al guardar el registro.', 'error');
            }

        } catch (error) {
            console.error("Frontend Error: Error en la petición fetch al guardar registro:", error);
            showNotification(`Error de conexión o respuesta inválida: ${error.message}`, 'error');
        } finally {
            if (saveButton) saveButton.disabled = false;
            isSubmitting = false;
        }
    }); 

    const cancelButton = form.querySelector('.cancel-btn');
    if (cancelButton && !cancelButton.dataset.page) { 
         cancelButton.addEventListener('click', (e) => {
             e.preventDefault();
             navigateTo('financeiro'); 
         });
    }

    console.log("Frontend: Inicialización de 'initTransactionForm' concluída.");
}