document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const userData = {
        username: username,
        email: email,
        password: password
    };

    try {
        const response = await fetch('http://api-gateway:8081/api/v1/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error("Ошибка при регистрации");
        }

        const result = await response.json();
        localStorage.setItem('jwt', result.token);
        localStorage.setItem('refreshToken', result.refreshToken);

        window.location.href = "dashboard.html";
    } catch (error) {
        alert(error.message);
    }
});
