console.log("Login script loaded");

// Lisää Enter-näppäimen tuki ensimmäiseen vaiheeseen (email ja salasana)
document.getElementById('email').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        sendCode();
    }
});

document.getElementById('password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        sendCode();
    }
});

// Lisää Enter-näppäimen tuki toiseen vaiheeseen (koodi)
document.getElementById('code').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        verifyCode();
    }
});

    async function sendCode() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('error-step1');
        errorDiv.innerText = "";

        try {
            const response = await fetch('api/login-step1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('step1').style.display = 'none';
                document.getElementById('step2').style.display = 'block';
            } else {
                errorDiv.innerText = result.message || "Kirjautuminen epäonnistui";
            }
        } catch (err) {
            errorDiv.innerText = "Yhteysvirhe palvelimeen.";
        }
    }

    async function verifyCode() {
        const code = document.getElementById('code').value;
        const errorDiv = document.getElementById('error-step2');
        errorDiv.innerText = "";

        try {
            const response = await fetch('api/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const result = await response.json();

            if (response.ok) {
                window.location.href = result.redirect;
            } else {
                errorDiv.innerText = result.message;
            }
        } catch (err) {
            errorDiv.innerText = "Vahvistus epäonnistui.";
        }
    }