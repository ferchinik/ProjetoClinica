// modules/forms/registration-form.js

import { showNotification } from '/js/notification.js';

/**
 * Inicializa o formulário de registro.
 */
export function initRegistrationForm() {
    const registerForm = document.getElementById('register-form');

    if (!registerForm) return;

    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const nombre = document.getElementById('nombre')?.value;
        const apellido = document.getElementById('apellido')?.value;
        const email = document.getElementById('email')?.value;
        const especialidad = document.getElementById('especialidad')?.value;
        const licencia = document.getElementById('licencia')?.value;
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;
        const terms = document.getElementById('terms')?.checked;

        // Validações
        if (!nombre || !apellido || !email || !especialidad || !licencia || !password || !confirmPassword) {
            showNotification('Por favor, complete todos los campos', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        if (!terms) {
            showNotification('Debe aceptar los términos y condiciones', 'error');
            return;
        }

        // Simula registro
        simulateRegistration();
    });
}

/**
 * Simula o processo de registro (poderia chamar API real).
 */
function simulateRegistration() {
    showNotification('Procesando registro...', 'info');

    setTimeout(() => {
        showNotification('Registro exitoso. Redirigiendo...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }, 1500);
}
