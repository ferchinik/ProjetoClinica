import { showNotification } from '../../notification.js'; // Se quiser usar as notificações globais

/**
 * Inicializa o formulário de login.
 */
export function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const passwordField = document.getElementById('password');
    const toggleIcon = document.querySelector('#password + .password-toggle i');

    if (!loginForm) return;

    // Listener de submit
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;

        // Validação simples
        if (!email || !password) {
            showNotification('Por favor, complete todos los campos', 'error');
            return;
        }

        // Simula login
        simulateLogin(email, password);
    });

    // Listener para mostrar/ocultar senha
    if (toggleIcon) {
        toggleIcon.addEventListener('click', () => togglePasswordVisibility(passwordField, toggleIcon));
    }
}

/**
 * Simula o processo de login (poderia chamar API real).
 */
function simulateLogin(email, password) {
    showNotification('Iniciando sesión...', 'info');

    // Simula chamada à API
    setTimeout(() => {
        // Armazena sessão
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('userEmail', email);

        // Redireciona (exemplo)
        window.location.href = 'index.html';
    }, 1500);
}

/**
 * Mostra/oculta a senha.
 */
function togglePasswordVisibility(passwordField, icon) {
    if (!passwordField) return;

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
