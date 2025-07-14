import { showNotification } from './notification.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordToggle = document.querySelector('.password-toggle');
    const rememberCheckbox = document.getElementById('remember-me');

    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            togglePasswordVisibility('password', passwordToggle.querySelector('i'));
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                alert('Por favor, complete todos los campos');
                return;
            }

            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            realLogin(email, password);
        });

        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            document.getElementById('email').value = savedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }
});

function togglePasswordVisibility(fieldId, iconEl) {
    const passwordField = document.getElementById(fieldId);
    if (!passwordField) return;

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        iconEl.classList.remove('fa-eye');
        iconEl.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        iconEl.classList.remove('fa-eye-slash');
        iconEl.classList.add('fa-eye');
    }
}

function simulateLogin(email, password) {
    alert('Iniciando sesión...');

    setTimeout(() => {
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('userEmail', email);

        window.location.href = 'index.html';
    }, 1500);
}

function realLogin(email, password) {
    alert('Iniciando sesión...');

    fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    throw new Error(errData.message || `Erro ${res.status}: ${res.statusText}`);
                });
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                console.log("Login bem-sucedido, dados recebidos:", data);
                sessionStorage.setItem('authenticated', 'true');
                sessionStorage.setItem('userEmail', data.user.email);
                sessionStorage.removeItem('hasNavigated');

                window.location.href = 'index.html#dashboard';
            } else {
                alert(data.message || 'Falha no login');
            }
        })
        .catch(err => {
            console.error("Erro na requisição de login:", err);
            alert(`Erro ao iniciar sesión: ${err.message}`);
        });
}
