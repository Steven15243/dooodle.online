document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('register').addEventListener('click', () => {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(response => {
            if (response.status === 201) {
                alert('Registration successful, please login');
                window.location.href = 'auth.html';  // Redirect to login form
            } else {
                return response.text().then(text => { throw new Error(text) });
            }
        }).catch(error => {
            alert(`Registration failed: ${error.message}`);
        });
    });

    document.getElementById('login').addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(response => response.json()).then(data => {
            if (data.message === 'Login successful') {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', username);
                window.location.href = 'index.html';  // Redirect to the main app
            } else {
                alert('Login failed');
            }
        });
    });
});
