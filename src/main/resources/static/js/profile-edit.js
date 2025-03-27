document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    function getUserIdFromToken() {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId || payload.sub;
        } catch (e) {
            console.error('Ошибка разбора токена:', e);
            return null;
        }
    }

    const userId = getUserIdFromToken();
    if (!userId) {
        alert('Ошибка авторизации');
        window.location.href = '/login.html';
        return;
    }

    const form = document.getElementById('profileForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    try {
        const response = await fetch(`http://localhost:8081/api/v1/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Ошибка загрузки данных');

        const user = await response.json();
        usernameInput.value = user.username;
        emailInput.value = user.email;
    } catch (error) {
        alert(error.message);
        window.location.href = '/login.html';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        document.querySelectorAll('.error').forEach(el => el.textContent = '');

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        let isValid = true;

        if (!username) {
            document.getElementById('usernameError').textContent = 'Введите имя пользователя';
            isValid = false;
        }

        if (!email) {
            document.getElementById('emailError').textContent = 'Введите email';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('emailError').textContent = 'Некорректный email';
            isValid = false;
        }

        if (!password) {
            document.getElementById('passwordError').textContent = 'Введите пароль';
            isValid = false;
        } else if (password.length < 6) {
            document.getElementById('passwordError').textContent = 'Пароль должен быть не менее 6 символов';
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await fetch(`http://localhost:8081/api/v1/users/update/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка обновления');
            }

            alert('Данные успешно сохранены');
            window.location.href = '/dashboard.html';
        } catch (error) {
            if (error.message.includes('email') || error.message.includes('почта')) {
                document.getElementById('emailError').textContent = error.message;
            } else if (error.message.includes('username') || error.message.includes('имя')) {
                document.getElementById('usernameError').textContent = error.message;
            } else if (error.message.includes('пароль') || error.message.includes('password')) {
                document.getElementById('passwordError').textContent = error.message;
            } else {
                alert('Ошибка: ' + error.message);
            }
        }
    });
});