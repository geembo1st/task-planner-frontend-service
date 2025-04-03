document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const formError = document.createElement('div');
    formError.className = 'error';
    formError.id = 'formError';
    loginForm.appendChild(formError);

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        let isValid = true;

        if (!email) {
            showError('emailError', 'Email обязателен');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('emailError', 'Некорректный email');
            isValid = false;
        }

        if (!password) {
            showError('passwordError', 'Пароль обязателен');
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await fetch('http://api-gateway:8081/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({email, password})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Неверный email или пароль');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            window.location.href = '/dashboard.html';

        } catch (error) {
            showError('formError', error.message || 'Ошибка сервера. Попробуйте позже.');
        }
    });
});

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
    }
}

function clearErrors() {
    const errors = document.querySelectorAll('.error');
    errors.forEach(error => {
        error.textContent = '';
    });
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}