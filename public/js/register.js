function togglePasswordVisibility(fieldId) {
    const passwordField = document.getElementById(fieldId);
    if (!passwordField) return;

    const icon = document.querySelector(`[data-toggle="${fieldId}"] i`);
    if (!icon) return;

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

function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;

    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const fieldId = toggle.getAttribute('data-toggle');
            togglePasswordVisibility(fieldId);
        });
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const email = document.getElementById('email').value;
        const especialidad = document.getElementById('especialidad').value;
        const licencia = document.getElementById('licencia').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        fetch('http://localhost:4000/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                apellido,
                email,
                especialidad,
                licencia,
                password
            })
        })
            .then(async (res) => {
                const responseText = await res.text();
                if (!res.ok) {
                    throw new Error(responseText || `Erro ${res.status}`);
                }
                return responseText;
            })
            .then((successMessage) => {
                alert(successMessage);
                registerForm.reset();

                window.location.href = 'login.html';

            })
            .catch((err) => {
                console.error("Erro durante o registro:", err);
                alert(`Erro ao registrar: ${err.message}`);
            });
    });
}

document.addEventListener('DOMContentLoaded', initRegisterForm);